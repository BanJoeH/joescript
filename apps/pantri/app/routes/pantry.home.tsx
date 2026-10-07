import { useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { Outlet, type ShouldRevalidateFunctionArgs, useLocation, useNavigate } from "react-router";
import type { Swiper as SwiperClass } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";

import { PullToRefreshScroll } from "~/components/pull-to-refresh-scroll";
import { RecipesListView } from "~/components/recipes/recipes-list-view";
import { ShoppingListView } from "~/components/shopping/shopping-list-view";
import { resolveHomeRecipes } from "~/lib/home-recipes-cache";
import { type HomeTab, useHomeTabPaneRef } from "~/lib/home-tab-scroll";
import { loadWithOfflineFallback } from "~/lib/offline/client-loader";
import { useOnlineStatus } from "~/lib/offline/connectivity";
import { applyPendingOutboxToHomeSnapshot, listOutbox } from "~/lib/offline/outbox";
import { prefetchPantryOfflineShells } from "~/lib/offline/register-sw";
import { getHomeSnapshot, saveHomeSnapshot } from "~/lib/offline/snapshot";
import { getHomeTabIndex, pantryPath } from "~/lib/pantry-path";
import { shouldRevalidatePantryRoutes } from "~/lib/pantry-revalidate";
import { reconcileShoppingPurchasedOverrides } from "~/lib/shopping-purchased-overrides";

import type { Route } from "./+types/pantry.home";

export { loader } from "./pantry.home.server";

export async function clientLoader({ params, serverLoader }: Route.ClientLoaderArgs) {
  const pantryId = params.pantryId;
  return loadWithOfflineFallback({
    serverLoader,
    readSnapshot: async () => {
      const snapshot = await getHomeSnapshot(pantryId);
      if (!snapshot) return null;
      return {
        shoppingRecipes: snapshot.shoppingRecipes,
        oddBits: snapshot.oddBits,
        recipes: snapshot.recipes,
        categoryOverrides: snapshot.categoryOverrides,
        pantryId: snapshot.pantryId,
      };
    },
    writeSnapshot: async (data) => {
      await saveHomeSnapshot(data);
      const merged = await applyPendingOutboxToHomeSnapshot(pantryId);
      const pending = await listOutbox(pantryId);
      const next = merged
        ? {
            shoppingRecipes: merged.shoppingRecipes,
            oddBits: merged.oddBits,
            recipes: merged.recipes,
            categoryOverrides: merged.categoryOverrides,
            pantryId: merged.pantryId,
          }
        : data;
      if (pending.length === 0) {
        reconcileShoppingPurchasedOverrides(next.shoppingRecipes, next.oddBits);
      }
      return next;
    },
  });
}

clientLoader.hydrate = true as const;

export function shouldRevalidate(args: ShouldRevalidateFunctionArgs) {
  return shouldRevalidatePantryRoutes(args);
}

function HomeTabPane({ tab, children }: { tab: HomeTab; children: React.ReactNode }) {
  const paneRef = useHomeTabPaneRef(tab);

  return (
    <PullToRefreshScroll className="home-slide-scroll px-0.5 pb-2" scrollRef={paneRef}>
      {children}
    </PullToRefreshScroll>
  );
}

type HomeTabData = {
  oddBits: Route.ComponentProps["loaderData"]["oddBits"];
  pantryId: string;
  recipes: ReturnType<typeof resolveHomeRecipes>;
  shoppingRecipes: Route.ComponentProps["loaderData"]["shoppingRecipes"];
};

function ShoppingTab({ oddBits, pantryId, shoppingRecipes }: HomeTabData) {
  return (
    <HomeTabPane tab="shopping">
      <ShoppingListView oddBits={oddBits} pantryId={pantryId} recipes={shoppingRecipes} />
    </HomeTabPane>
  );
}

function RecipesTab({ pantryId, recipes }: Pick<HomeTabData, "pantryId" | "recipes">) {
  return (
    <HomeTabPane tab="recipes">
      <RecipesListView pantryId={pantryId} recipes={recipes} />
    </HomeTabPane>
  );
}

function useClientReady() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function HomeTabs({ activeIndex, ...data }: HomeTabData & { activeIndex: 0 | 1 }) {
  const clientReady = useClientReady();
  const location = useLocation();
  const navigate = useNavigate();
  const swiperRef = useRef<SwiperClass | null>(null);

  useLayoutEffect(() => {
    const swiper = swiperRef.current;
    if (swiper && swiper.activeIndex !== activeIndex) {
      swiper.slideTo(activeIndex, 0);
    }
  }, [activeIndex]);

  if (!clientReady) {
    return activeIndex === 0 ? <ShoppingTab {...data} /> : <RecipesTab {...data} />;
  }

  return (
    <Swiper
      className="home-swiper"
      focusableElements="input[type=text], input[type=search], input[type=email], input[type=password], input[type=number], input:not([type]), textarea, select"
      initialSlide={activeIndex}
      onSlideChange={(swiper) => {
        const nextPath =
          swiper.activeIndex === 0
            ? pantryPath(data.pantryId, "shopping")
            : pantryPath(data.pantryId, "recipes");
        if (location.pathname !== nextPath) {
          void navigate(nextPath);
        }
      }}
      onSwiper={(swiper) => {
        swiperRef.current = swiper;
        if (swiper.activeIndex !== activeIndex) {
          swiper.slideTo(activeIndex, 0);
        }
      }}
      slidesPerView={1}
      touchEventsTarget="container"
      touchStartPreventDefault={false}
    >
      <SwiperSlide>
        <ShoppingTab {...data} />
      </SwiperSlide>
      <SwiperSlide>
        <RecipesTab {...data} />
      </SwiperSlide>
    </Swiper>
  );
}

export default function PantryHomePage({ loaderData }: Route.ComponentProps) {
  const { shoppingRecipes, oddBits, recipes: loaderRecipes, pantryId } = loaderData;
  const recipes = useMemo(
    () => resolveHomeRecipes(pantryId, loaderRecipes),
    [pantryId, loaderRecipes],
  );
  const location = useLocation();
  const activeIndex = getHomeTabIndex(location.pathname, pantryId);
  const online = useOnlineStatus();
  const recipeIdsKey = recipes.map((recipe) => recipe.id).join(",");

  useEffect(() => {
    if (!online) return;
    const recipeIds = recipeIdsKey.length > 0 ? recipeIdsKey.split(",") : [];
    prefetchPantryOfflineShells(pantryId, { recipeIds });
  }, [online, pantryId, recipeIdsKey]);

  return (
    <>
      <div className="home-swiper-shell flex h-full min-h-0 min-w-0 w-full max-w-full flex-1 flex-col">
        <HomeTabs
          activeIndex={activeIndex}
          oddBits={oddBits}
          pantryId={pantryId}
          recipes={recipes}
          shoppingRecipes={shoppingRecipes}
        />
      </div>
      <div className="hidden" hidden>
        <Outlet />
      </div>
    </>
  );
}

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Pantri" }];
}
