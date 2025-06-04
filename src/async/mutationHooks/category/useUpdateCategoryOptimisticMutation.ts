import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useSupabaseSession } from "../../../store/componentStore";
import { type CategoriesData } from "../../../types/apiTypes";
import { CATEGORIES_KEY } from "../../../utils/constants";
import { updateCategory } from "../../supabaseCrudHelpers";

// updates a category optimistically
export default function useUpdateCategoryOptimisticMutation() {
	const session = useSupabaseSession((state) => state.session);
	const queryClient = useQueryClient();
	// const { sortBy } = useGetSortBy();
	// const { category_id: CATEGORIES_ID } = useGetCurrentCategoryId();

	const updateCategoryOptimisticMutation = useMutation(updateCategory, {
		onMutate: async (data) => {
			// Cancel any outgoing refetches (so they don't overwrite our optimistic update)
			await queryClient.cancelQueries([CATEGORIES_KEY, session?.user?.id]);

			// Snapshot the previous value
			const previousData = queryClient.getQueryData([
				CATEGORIES_KEY,
				session?.user?.id,
			]);

			// Optimistically update to the new value
			queryClient.setQueryData(
				[CATEGORIES_KEY, session?.user?.id],
				(old: { data: CategoriesData[] } | undefined) =>
					({
						...old,
						data: old?.data?.map((item) => {
							if (item?.id === data?.category_id) {
								return {
									...item,
									category_name: data?.updateData?.category_name
										? data?.updateData?.category_name
										: item?.category_name,
									category_views: data?.updateData?.category_views
										? data?.updateData?.category_views
										: item?.category_views,
									icon: data?.updateData?.icon
										? data?.updateData?.icon
										: item?.icon,
									icon_color: data?.updateData?.icon_color
										? data?.updateData?.icon_color
										: item?.icon_color,
									is_public:
										data?.updateData?.is_public !== undefined
											? data?.updateData?.is_public
											: item?.is_public,
								};
							}

							return item;
						}),
					}) as { data: CategoriesData[] },
			);

			// Return a context object with the snapshotted value
			return { previousData };
		},
		// If the mutation fails, use the context returned from onMutate to roll back
		onError: (context: { previousData: CategoriesData }) => {
			queryClient.setQueryData(
				[CATEGORIES_KEY, session?.user?.id],
				context?.previousData,
			);
		},
		// Always refetch after error or success:
		onSettled: () => {
			void queryClient.invalidateQueries([CATEGORIES_KEY, session?.user?.id]);
			// removed due to the multiple get bookmark fetch when changing sort by issue
			// void queryClient.invalidateQueries([
			// 	BOOKMARKS_KEY,
			// 	session?.user?.id,
			// 	CATEGORIES_ID,
			// 	// sortBy
			// ]);
		},
	});

	return { updateCategoryOptimisticMutation };
}
