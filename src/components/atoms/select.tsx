import { type ChangeEvent } from "react";

type SelectProps = {
	defaultValue: number | string;
	id?: string;
	onChange: (event: ChangeEvent<HTMLSelectElement>) => Promise<void> | void;
	options: Array<{ name: string; value: number | string }>;
};

const Select = (props: SelectProps) => {
	const { options, onChange, defaultValue, id } = props;
	return (
		<select
			className="mt-1 block rounded-md border-gray-300 py-1 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
			defaultValue={defaultValue}
			id={id}
			onChange={onChange}
		>
			{options?.map((item) => (
				<option key={item?.value} value={item?.value}>
					{item?.name}
				</option>
			))}
		</select>
	);
};

export default Select;
