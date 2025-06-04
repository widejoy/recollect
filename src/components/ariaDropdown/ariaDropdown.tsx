import { type RefObject } from "react";
import { Menu, MenuButton, useMenuState } from "ariakit/menu";

import { type ChildrenTypes } from "../../types/componentTypes";

type AriaDropDownPropertyTypes = {
	children: ChildrenTypes;
	// the element you want to focus when the menu opens
	initialFocusRef?: RefObject<HTMLElement> | undefined;
	isOpen?: boolean;
	menuButton: ChildrenTypes;
	menuButtonActiveClassName?: string;
	menuButtonClassName?: string;
	menuClassName?: string;
	menuOpenToggle?: (value: boolean) => void;
	onButtonClick?: (event: React.MouseEvent<HTMLElement>) => void;
};

const AriaDropDown = (props: AriaDropDownPropertyTypes) => {
	const menu = useMenuState({
		gutter: 1,
		open: props.isOpen,
		setOpen: (value) => menuOpenToggle(value),
	});
	const {
		menuButton,
		menuClassName,
		menuButtonClassName,
		menuOpenToggle = () => null,
		children,

		// we have this as a prop because i dont want to send menu state to button render prop
		menuButtonActiveClassName,
		onButtonClick = () => null,
	} = props;

	return (
		<>
			<MenuButton
				className={`${menuButtonClassName ?? ""} ${
					(menu.open && menuButtonActiveClassName) ?? ""
				} focus-visible:outline-none`}
				onClick={onButtonClick}
				state={menu}
			>
				{menuButton}
			</MenuButton>
			<Menu
				className={`${menuClassName ?? ""} focus-visible:outline-none`}
				initialFocusRef={props.initialFocusRef}
				state={menu}
			>
				{children}
			</Menu>
		</>
	);
};

export default AriaDropDown;
