import { useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import type { Swiper as SwiperClass } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";

import { RecipesListView } from "~/components/recipes/recipes-list-view";
import { ShoppingListView } from "~/components/shopping/shopping-list-view";
import { type HomeTab, useHomeTabPaneRef } from "~/lib/home-tab-scroll";
import { pantryPath } from "~/lib/pantry-path";

import type { Route } from "./+types/pantry.home";

export { loader } from "./pantry.home.server";

function HomeTabPane({ tab, children }: { tab: HomeTab; children: React.ReactNode }) {
  const paneRef = useHomeTabPaneRef(tab);

  return (
    <div className="home-slide-scroll px-0.5 pb-2" ref={paneRef}>
      {children}
    </div>
  );
}

export default function PantryHomePage({ loaderData }: Route.ComponentProps) {
  const { shoppingRecipes, oddBits, recipes, pantryId } = loaderData;
  const location = useLocation();
  const navigate = useNavigate();
  const swiperRef = useRef<SwiperClass | null>(null);
  const activeIndex = location.pathname.includes("/recipes") ? 1 : 0;

  useEffect(() => {
    if (swiperRef.current && swiperRef.current.activeIndex !== activeIndex) {
      swiperRef.current.slideTo(activeIndex);
    }
  }, [activeIndex]);

  return (
    <>
      <div className="home-swiper-shell flex h-full min-h-0 min-w-0 w-full max-w-full flex-1 flex-col">
        <Swiper
          className="home-swiper"
          // Allow horizontal swipes that start on checkboxes/labels/buttons;
          // only block steal-prevention on real text entry fields.
          focusableElements="input[type=text], input[type=search], input[type=email], input[type=password], input[type=number], input:not([type]), textarea, select"
          initialSlide={activeIndex}
          onSlideChange={(swiper) => {
            const nextPath =
              swiper.activeIndex === 0
                ? pantryPath(pantryId, "shopping")
                : pantryPath(pantryId, "recipes");
            if (location.pathname !== nextPath) {
              void navigate(nextPath);
            }
          }}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
          }}
          slidesPerView={1}
          touchEventsTarget="container"
          touchStartPreventDefault={false}
        >
          <SwiperSlide>
            <HomeTabPane tab="shopping">
              <ShoppingListView oddBits={oddBits} pantryId={pantryId} recipes={shoppingRecipes} />
            </HomeTabPane>
          </SwiperSlide>
          <SwiperSlide>
            <HomeTabPane tab="recipes">
              <RecipesListView pantryId={pantryId} recipes={recipes} />
            </HomeTabPane>
          </SwiperSlide>
        </Swiper>
      </div>
      {/* Keep child routes mounted for actions/meta without duplicating UI. */}
      <div className="hidden" hidden>
        <Outlet />
      </div>
    </>
  );
}

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Pantri" }];
}
