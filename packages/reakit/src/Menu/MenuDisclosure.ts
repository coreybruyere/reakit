import * as React from "react";
import { mergeProps } from "../utils/mergeProps";
import { unstable_createComponent } from "../utils/createComponent";
import {
  PopoverDisclosureOptions,
  PopoverDisclosureProps,
  usePopoverDisclosure
} from "../Popover/PopoverDisclosure";
import { createOnKeyDown } from "../__utils/createOnKeyDown";
import { warning } from "../__utils/warning";
import { unstable_createHook } from "../utils/createHook";
import { useMenuState, MenuStateReturn } from "./MenuState";
import { MenuContext } from "./__utils/MenuContext";

export type MenuDisclosureOptions = PopoverDisclosureOptions &
  Pick<Partial<MenuStateReturn>, "hide"> &
  Pick<MenuStateReturn, "show" | "placement" | "first" | "last">;

export type MenuDisclosureProps = PopoverDisclosureProps;

const noop = () => {};

export const useMenuDisclosure = unstable_createHook<
  MenuDisclosureOptions,
  MenuDisclosureProps
>({
  name: "MenuDisclosure",
  compose: usePopoverDisclosure,
  useState: useMenuState,

  useProps(options, htmlProps) {
    const parent = React.useContext(MenuContext);
    const ref = React.useRef<HTMLElement>(null);
    // This avoids race condition between focus and click.
    // On some browsers, focus is triggered right before click.
    // So we use it to disable toggling.
    const [hasShownOnFocus, setHasShownOnFocus] = React.useState(false);
    const [dir] = options.placement.split("-");

    // Restores hasShownOnFocus
    React.useEffect(() => {
      if (hasShownOnFocus) {
        setTimeout(() => setHasShownOnFocus(false), 200);
      }
    }, [hasShownOnFocus]);

    const onKeyDown = React.useMemo(
      () =>
        createOnKeyDown({
          stopPropagation: event => event.key !== "Escape",
          onKey: options.show,
          keyMap: () => {
            const first = () => setTimeout(options.first);
            return {
              Escape: options.hide,
              Enter: parent && first,
              " ": parent && first,
              ArrowUp: dir === "top" || dir === "bottom" ? options.last : false,
              ArrowRight: dir === "right" && first,
              ArrowDown: dir === "bottom" || dir === "top" ? first : false,
              ArrowLeft: dir === "left" && first
            };
          }
        }),
      [options.show, options.hide, options.first, options.last]
    );

    const onFocus = React.useCallback(() => {
      if (parent && parent.orientation === "horizontal") {
        setHasShownOnFocus(true);
        options.show();
      }
    }, [parent && parent.orientation, setHasShownOnFocus, options.show]);

    const onMouseOver = React.useCallback(() => {
      if (!parent) return;

      if (!ref.current) {
        warning(
          true,
          "Can't respond to mouse over on `MenuDisclosure` because `ref` wasn't passed to component. See https://reakit.io/docs/menu",
          "MenuDisclosure"
        );
        return;
      }

      const parentIsHorizontal = parent.orientation === "horizontal";

      if (!parentIsHorizontal) {
        setTimeout(() => {
          if (ref.current && ref.current.contains(document.activeElement)) {
            options.show();
            ref.current.focus();
          }
        }, 200);
      } else {
        const parentMenu = ref.current.closest("[role=menu],[role=menubar]");
        const subjacentOpenMenu =
          parentMenu && parentMenu.querySelector("[role=menu]:not([hidden])");
        if (subjacentOpenMenu) {
          ref.current.focus();
        }
      }
    }, [parent && parent.orientation, options.show]);

    return mergeProps(
      {
        ref,
        "aria-haspopup": "menu",
        onClick:
          parent && (parent.orientation !== "horizontal" || hasShownOnFocus)
            ? options.show
            : options.toggle,
        onFocus,
        onMouseOver,
        onKeyDown
      } as MenuDisclosureProps,
      htmlProps
    );
  },

  useCompose(options, htmlProps) {
    // Toggling is handled by MenuDisclosure
    return usePopoverDisclosure({ ...options, toggle: noop }, htmlProps);
  }
});

export const MenuDisclosure = unstable_createComponent({
  as: "button",
  useHook: useMenuDisclosure
});