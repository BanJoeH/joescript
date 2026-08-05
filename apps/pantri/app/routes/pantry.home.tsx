import { useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { Outlet, type ShouldRevalidateFunctionArgs, useLocation, useNavigate } from "react-router";
import type { Swiper as SwiperClass } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";

import { RecipesListView } from "~/components/recipes/recipes-list-view";
import { ShoppingListView } from "~/components/shopping/shopping-list-view";
import { resolveHomeRecipes } from "~/lib/home-recipes-cache";
import { type HomeTab, useHomeTabPaneRef } from "~/lib/home-tab-scroll";
import { getHomeTabIndex, pantryPath } from "~/lib/pantry-path";
import { shouldRevalidatePantryRoutes } from "~/lib/pantry-revalidate";

import type { Route } from "./+types/pantry.home";

export { loader } from "./pantry.home.server";

export function shouldRevalidate(args: ShouldRevalidateFunctionArgs) {
  return shouldRevalidatePantryRoutes(args);
}

function HomeTabPane({ tab, children }: { tab: HomeTab; children: React.ReactNode }) {
  const paneRef = useHomeTabPaneRef(tab);

  return (
    <div className="home-slide-scroll px-0.5 pb-2" ref={paneRef}>
      {children}
    </div>
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
