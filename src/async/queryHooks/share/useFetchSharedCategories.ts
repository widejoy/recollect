import { useQuery } from "@tanstack/react-query";

import { type FetchSharedCategoriesData } from "../../../types/apiTypes";
import { SHARED_CATEGORIES_TABLE_NAME } from "../../../utils/constants";
import { fetchSharedCategoriesData } from "../../supabaseCrudHelpers";

// fetchs user shared categories
export default function useFetchSharedCategories() {
	const { data: sharedCategoriesData } = useQuery<{
		data: FetchSharedCategoriesData[] | null;
		error: Error;
	}>(
		[SHARED_CATEGORIES_TABLE_NAME],
		async () => await fetchSharedCategoriesData(),
	);

	return {
		sharedCategoriesData,
	};
}
