import { useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { Outlet, type ShouldRevalidateFunctionArgs, useLocation, useNavigate } from "react-router";
import type { Swiper as SwiperClass } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";

import { PullToRefreshScroll } from "~/components/pull-to-refresh-scroll";
import { RecipesListView } from "~/components/recipes/recipes-list-view";
import { ShoppingOfflineBanner } from "~/components/shopping/offline-banner";
import { ShoppingListView } from "~/components/shopping/shopping-list-view";
import { resolveHomeRecipes } from "~/lib/home-recipes-cache";
import { type HomeTab, useHomeTabPaneRef } from "~/lib/home-tab-scroll";
import {
  loadOfflineShoppingSnapshot,
  writeSnapshotBaseAndApply,
} from "~/lib/offline/hydrate-shopping";
import { listRecipesFromSnapshot, writeRecipesSnapshot } from "~/lib/offline/recipes-snapshot";
import { deserializeShoppingRecipes } from "~/lib/offline/types";
import { getHomeTabIndex, pantryPath } from "~/lib/pantry-path";
import { shouldRevalidateShoppingLoaders } from "~/lib/shopping-local-merge";

import type { Route } from "./+types/pantry.home";

export { loader } from "./pantry.home.server";

export function shouldRevalidate(args: ShouldRevalidateFunctionArgs) {
  return shouldRevalidateShoppingLoaders(args);
}

export async function clientLoader({ serverLoader, params }: Route.ClientLoaderArgs) {
  const pantryId = params.pantryId;
  try {
    const data = await serverLoader();
    try {
      const applied = await writeSnapshotBaseAndApply(pantryId, {
        shoppingRecipes: data.shoppingRecipes,
        oddBits: data.oddBits,
      });
      try {
        await writeRecipesSnapshot(pantryId, data.recipes);
      } catch {
        // Keep shopping hydrate even if recipes snapshot write fails.
      }
      return {
        ...data,
        shoppingRecipes: deserializeShoppingRecipes(applied.shoppingRecipes),
        oddBits: applied.oddBits,
      };
    } catch {
      // Dehydrated/server data is still usable if snapshot persist fails.
      return data;
    }
  } catch (error) {
    const offline = await loadOfflineShoppingSnapshot(pantryId);
    if (!offline) throw error;
    const recipes = await listRecipesFromSnapshot(pantryId);
    return {
      shoppingRecipes: deserializeShoppingRecipes(offline.applied.shoppingRecipes),
      oddBits: offline.applied.oddBits,
      recipes,
      pantryId,
    };
  }
}
clientLoader.hydrate = true;

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
      <div className="flex flex-col gap-3">
        <ShoppingOfflineBanner pantryId={pantryId} />
        <ShoppingListView oddBits={oddBits} pantryId={pantryId} recipes={shoppingRecipes} />
      </div>
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
