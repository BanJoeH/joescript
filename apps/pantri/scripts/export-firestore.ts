/**
 * Export legacy Pantri data from Firestore into the JSON shape expected by
 * `scripts/import-firestore.ts`.
 *
 * ## Prerequisites
 *
 * 1. Firebase Console → Project settings → Service accounts → Generate new
 *    private key (JSON). Keep it out of git.
 * 2. Point the script at that key via one of:
 *      - `GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json`
 *      - `FIREBASE_SERVICE_ACCOUNT=/path/to/serviceAccount.json`
 *      - `FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'`
 * 3. Optional: `FIREBASE_PROJECT_ID=pantri-128f4` (otherwise read from the key).
 *
 * ## Usage
 *
 *   # One user (Firebase Auth uid from Console → Authentication)
 *   pnpm export:firestore -- --uid=<firebase-uid> --out=./firestore-export.json
 *
 *   # Every Auth user that has a users/{uid} profile (writes one file each)
 *   pnpm export:firestore -- --all --out-dir=./firestore-exports
 *
 * Then import:
 *
 *   pnpm import:firestore -- ./firestore-export.json
 *
 * ## Firestore layout (legacy app)
 *
 *   users/{uid}                         → profile (oddBits, ingredientCategories, displayName…)
 *   users/{uid}/recipes/{recipeId}      → recipe templates
 *   users/{uid}/shoppingList/{id}       → shopping-list recipes
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { type App, applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

type RawIngredient = string | { name: string; purchased?: boolean };

type LegacyRecipeTemplate = {
  id: string;
  name: string;
  link?: string;
  ingredients: string[];
};

type LegacyShoppingRecipe = {
  id: string;
  name: string;
  link?: string;
  ingredients: RawIngredient[];
};

type LegacyPantriExport = {
  legacyUid: string;
  pantryName?: string;
  memberEmails?: string[];
  recipes?: LegacyRecipeTemplate[];
  shoppingList?: LegacyShoppingRecipe[];
  oddBits?: RawIngredient[];
  ingredientCategories?: Record<string, string>;
};

type CliArgs = {
  uid?: string;
  all: boolean;
  out?: string;
  outDir?: string;
  pantryName?: string;
  email?: string;
};

function printUsage() {
  console.error(`Usage:
  pnpm export:firestore -- --uid=<firebase-uid> [--out=./firestore-export.json]
  pnpm export:firestore -- --all [--out-dir=./firestore-exports]

Options:
  --uid=<id>           Export a single Firebase Auth user
  --all                Export every Auth user that has a users/{uid} doc
  --out=<path>         Output file for --uid (default: ./firestore-export-<uid>.json)
  --out-dir=<path>     Output directory for --all (default: ./firestore-exports)
  --pantry-name=<name> Override pantryName in the export
  --email=<addr>       Extra memberEmails entry (in addition to the Auth email)

Credentials (one of):
  GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
  FIREBASE_SERVICE_ACCOUNT=/path/to/serviceAccount.json
  FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
`);
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { all: false };

  for (const arg of argv) {
    if (arg === "--") continue;
    if (arg === "--all") {
      args.all = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (!match) {
      console.error(`Unknown argument: ${arg}`);
      printUsage();
      process.exit(1);
    }
    const [, key, value] = match;
    if (key === "uid") args.uid = value;
    else if (key === "out") args.out = value;
    else if (key === "out-dir") args.outDir = value;
    else if (key === "pantry-name") args.pantryName = value;
    else if (key === "email") args.email = value;
    else {
      console.error(`Unknown option: --${key}`);
      printUsage();
      process.exit(1);
    }
  }

  return args;
}

function loadServiceAccount(): Record<string, unknown> | null {
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (jsonEnv) {
    return JSON.parse(jsonEnv) as Record<string, unknown>;
  }

  const pathEnv =
    process.env.FIREBASE_SERVICE_ACCOUNT?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (pathEnv) {
    const resolved = resolve(pathEnv);
    if (!existsSync(resolved)) {
      throw new Error(`Service account file not found: ${resolved}`);
    }
    return JSON.parse(readFileSync(resolved, "utf8")) as Record<string, unknown>;
  }

  return null;
}

function initFirebase(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccount = loadServiceAccount();
  if (serviceAccount) {
    const projectId =
      process.env.FIREBASE_PROJECT_ID?.trim() ||
      (typeof serviceAccount.project_id === "string" ? serviceAccount.project_id : undefined);

    return initializeApp({
      credential: cert(serviceAccount as Parameters<typeof cert>[0]),
      ...(projectId ? { projectId } : {}),
    });
  }

  // Fall back to ADC (gcloud auth application-default login, Cloud Run, etc.)
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || "pantri-128f4";
  return initializeApp({
    credential: applicationDefault(),
    projectId,
  });
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeRecipeIngredients(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (entry && typeof entry === "object" && "name" in entry) {
        return String((entry as { name: unknown }).name ?? "");
      }
      return "";
    })
    .filter(Boolean);
}

function normalizeShoppingIngredients(raw: unknown): RawIngredient[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry): RawIngredient | null => {
      if (typeof entry === "string") return entry;
      if (entry && typeof entry === "object" && "name" in entry) {
        const record = entry as { name: unknown; purchased?: unknown };
        const name = String(record.name ?? "").trim();
        if (!name) return null;
        return {
          name,
          purchased: Boolean(record.purchased),
        };
      }
      return null;
    })
    .filter((entry): entry is RawIngredient => entry != null);
}

function normalizeOddBits(raw: unknown): RawIngredient[] {
  return normalizeShoppingIngredients(raw);
}

function normalizeCategories(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim();
    }
  }
  return out;
}

async function exportUser(
  uid: string,
  options: { pantryName?: string; extraEmail?: string },
): Promise<LegacyPantriExport> {
  const db = getFirestore();
  const auth = getAuth();

  const profileSnap = await db.doc(`users/${uid}`).get();
  const profile = profileSnap.exists ? (profileSnap.data() ?? {}) : {};

  const [recipesSnap, shoppingSnap, userRecord] = await Promise.all([
    db.collection(`users/${uid}/recipes`).get(),
    db.collection(`users/${uid}/shoppingList`).get(),
    auth.getUser(uid).catch(() => null),
  ]);

  const recipes: LegacyRecipeTemplate[] = recipesSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: asString(data.name) || "Untitled recipe",
      link: asString(data.link),
      ingredients: normalizeRecipeIngredients(data.ingredients),
    };
  });

  const shoppingList: LegacyShoppingRecipe[] = shoppingSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: asString(data.name) || "Untitled recipe",
      link: asString(data.link),
      ingredients: normalizeShoppingIngredients(data.ingredients),
    };
  });

  const memberEmails = new Set<string>();
  if (userRecord?.email) memberEmails.add(userRecord.email.toLowerCase());
  if (options.extraEmail) memberEmails.add(options.extraEmail.trim().toLowerCase());

  const displayName =
    asString(profile.displayName) ||
    asString(userRecord?.displayName) ||
    userRecord?.email?.split("@")[0];

  return {
    legacyUid: uid,
    pantryName:
      options.pantryName?.trim() || (displayName ? `${displayName}'s pantry` : "Imported Pantry"),
    memberEmails: [...memberEmails],
    recipes,
    shoppingList,
    oddBits: normalizeOddBits(profile.oddBits),
    ingredientCategories: normalizeCategories(profile.ingredientCategories),
  };
}

async function listExportableUids(): Promise<string[]> {
  const auth = getAuth();
  const db = getFirestore();
  const uids: string[] = [];
  let pageToken: string | undefined;

  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const user of page.users) {
      const profile = await db.doc(`users/${user.uid}`).get();
      if (profile.exists) {
        uids.push(user.uid);
      }
    }
    pageToken = page.pageToken;
  } while (pageToken);

  return uids;
}

function writeExport(path: string, data: LegacyPantriExport) {
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(
    `Wrote ${basename(resolved)} (recipes=${data.recipes?.length ?? 0}, shopping=${data.shoppingList?.length ?? 0}, oddBits=${data.oddBits?.length ?? 0})`,
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.uid && !args.all) {
    printUsage();
    process.exitCode = 1;
    return;
  }
  if (args.uid && args.all) {
    console.error("Use either --uid or --all, not both.");
    process.exitCode = 1;
    return;
  }

  initFirebase();

  if (args.uid) {
    const data = await exportUser(args.uid, {
      pantryName: args.pantryName,
      extraEmail: args.email,
    });
    const out = args.out ?? resolve(process.cwd(), `firestore-export-${args.uid.slice(0, 8)}.json`);
    writeExport(out, data);
    return;
  }

  const uids = await listExportableUids();
  if (uids.length === 0) {
    console.error("No Auth users with a users/{uid} profile document were found.");
    process.exitCode = 1;
    return;
  }

  const outDir = resolve(args.outDir ?? "./firestore-exports");
  mkdirSync(outDir, { recursive: true });
  console.log(`Exporting ${uids.length} user(s) to ${outDir}`);

  for (const uid of uids) {
    const data = await exportUser(uid, {
      pantryName: args.pantryName,
      extraEmail: args.email,
    });
    writeExport(resolve(outDir, `firestore-export-${uid}.json`), data);
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
