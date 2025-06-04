import { Checkbox as AriaCheckbox } from "ariakit/checkbox";

type CheckboxPropsTypes = {
	checked: boolean;
	disabled?: boolean;
	label: string;
	onChange: (value: number | string) => void;
	value: number | string;
};

const Checkbox = (props: CheckboxPropsTypes) => {
	const { label, value, onChange, checked, disabled = false } = props;

	return (
		// disabling this because as per docs htmlFor is not needed
		// eslint-disable-next-line tailwindcss/no-custom-classname
		<label className="checkbox-container relative flex cursor-pointer items-center">
			<AriaCheckbox
				checked={checked}
				className="aria-checkbox opacity-0"
				disabled={disabled}
				onChange={(event) => onChange(event.target.value)}
				value={value}
			/>
			<div className="checkbox-div pointer-events-none absolute h-4 w-4" />
			<span
				// eslint-disable-next-line tailwindcss/no-custom-classname
				className={`checkmark ml-3 text-sm leading-[21px] text-gray-light-12  ${
					disabled ? "opacity-50" : ""
				}`}
			>
				{label}
			</span>
		</label>
	);
};

export default Checkbox;
