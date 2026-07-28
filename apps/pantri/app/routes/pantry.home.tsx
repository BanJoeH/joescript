import { useEffect, useRef } from "react";
import { Outlet, useLoaderData, useLocation, useNavigate } from "react-router";
import type { Swiper as SwiperClass } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";

import { RecipesListView } from "~/components/recipes/recipes-list-view";
import { ShoppingListView } from "~/components/shopping/shopping-list-view";
import { pantryPath } from "~/lib/pantry-path";

import type { Route } from "./+types/pantry.home";

export { loader } from "./pantry.home.server";

function HomeSlide({
  active,
  children,
  swiperRef,
}: {
  active: boolean;
  children: React.ReactNode;
  swiperRef: React.MutableRefObject<SwiperClass | null>;
}) {
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const updateHeight = () => {
      swiperRef.current?.update();
      swiperRef.current?.updateAutoHeight(0);
    };

    updateHeight();
    const animationFrame = window.requestAnimationFrame(updateHeight);

    const content = contentRef.current;
    if (!content || typeof ResizeObserver === "undefined") {
      return () => window.cancelAnimationFrame(animationFrame);
    }

    const observer = new ResizeObserver(updateHeight);
    observer.observe(content);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [active, swiperRef]);

  return (
    <div className="home-slide-content px-0.5 pb-2" ref={contentRef}>
      {children}
    </div>
  );
}

export default function PantryHomePage() {
  const { shoppingRecipes, oddBits, recipes, pantryId } =
    useLoaderData<typeof import("./pantry.home.server").loader>();
  const location = useLocation();
  const navigate = useNavigate();
  const swiperRef = useRef<SwiperClass | null>(null);
  const activeIndex = location.pathname.includes("/recipes") ? 1 : 0;

  useEffect(() => {
    if (swiperRef.current && swiperRef.current.activeIndex !== activeIndex) {
      swiperRef.current.slideTo(activeIndex);
    }
    window.scrollTo({ top: 0 });
  }, [activeIndex]);

  return (
    <>
      <div className="mx-[-2.5%] flex min-h-[calc(100dvh-11rem)] flex-1 flex-col px-[2.5%] md:min-h-[calc(100dvh-9rem)]">
        <Swiper
          autoHeight
          className="home-swiper w-full flex-1"
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
              window.scrollTo({ top: 0 });
              void navigate(nextPath);
            }
          }}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
          }}
          slidesPerView={1}
          touchEventsTarget="container"
        >
          <SwiperSlide>
            <HomeSlide active={activeIndex === 0} swiperRef={swiperRef}>
              <ShoppingListView oddBits={oddBits} pantryId={pantryId} recipes={shoppingRecipes} />
            </HomeSlide>
          </SwiperSlide>
          <SwiperSlide>
            <HomeSlide active={activeIndex === 1} swiperRef={swiperRef}>
              <RecipesListView pantryId={pantryId} recipes={recipes} />
            </HomeSlide>
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
