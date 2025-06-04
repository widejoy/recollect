import { type NextApiResponse } from "next";
import {
	type PostgrestError,
	type PostgrestResponse,
} from "@supabase/supabase-js";
import { find, isEmpty } from "lodash";
import isNull from "lodash/isNull";

import {
	type CategoriesData,
	type CollabDataInCategory,
	type FetchSharedCategoriesData,
	type NextApiRequest,
} from "../../../types/apiTypes";
import {
	CATEGORIES_TABLE_NAME,
	SHARED_CATEGORIES_TABLE_NAME,
} from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

/**
 * Fetches user categories and builds it so that we get all its colaborators data
 */

type Data = {
	data: CategoriesData[] | null;
	error: PostgrestError | string | { message: string } | null;
};

export default async function handler(
	request: NextApiRequest<{}>,
	response: NextApiResponse<Data>,
) {
	const supabase = apiSupabaseClient(request, response);

	const userData = await supabase?.auth?.getUser();

	const userId = userData?.data?.user?.id as string;
	const userEmail = userData?.data?.user?.email as string;

	// filter onces where is_public true and userId is not same as uuid
	const { data, error } = await supabase
		.from(CATEGORIES_TABLE_NAME)
		.select(
			`
      *,
      user_id (*)
    `,
		)
		.eq("user_id", userId);

	// get shared-cat data
	const {
		data: sharedCategoryData,
	}: PostgrestResponse<FetchSharedCategoriesData> = await supabase.from(
		SHARED_CATEGORIES_TABLE_NAME,
	).select(`
      *,
      user_id (id, profile_pic),
      email
    `);
	// .eq('email', req.body.userEmail); // TODO: this needs to be uncommented

	// fetch categories where user is a colloborator

	const { data: userCollabCategoryData, error: userCollabError } =
		await supabase
			.from(SHARED_CATEGORIES_TABLE_NAME)
			.select(`category_id!inner(*, user_id(*))`)
			.eq("email", userEmail)
			.eq("is_accept_pending", false);

	if (!isNull(userCollabError)) {
		response.status(500).json({
			data: null,
			error: `Collab data error: ${userCollabError?.message}`,
		});
	}

	const flattenedUserCollabCategoryData = userCollabCategoryData?.map(
		(item) => item.category_id,
	);

	const userCategoriesDataWithCollabCategoriesData = [
		...(data as CategoriesData[]),
		...(flattenedUserCollabCategoryData as unknown as CategoriesData[]),
	];

	// add colaborators data in each category
	const finalDataWithCollab = userCategoriesDataWithCollabCategoriesData?.map(
		(item) => {
			let collabData = [] as CollabDataInCategory[];
			if (sharedCategoryData)
				for (const catItem of sharedCategoryData) {
					if (catItem?.category_id === item?.id) {
						collabData = [
							...collabData,
							{
								userEmail: catItem?.email,
								edit_access: catItem?.edit_access,
								share_id: catItem?.id,
								isOwner: false,
								is_accept_pending: catItem?.is_accept_pending,
								profile_pic: null,
							},
						];
					}
				}

			const collabDataWithOwnerData = [
				...collabData,
				{
					userEmail: item?.user_id?.email,
					edit_access: true,
					share_id: null,
					isOwner: true,
					is_accept_pending: false,
					profile_pic: item?.user_id?.profile_pic,
				},
			];

			return {
				...item,
				collabData: collabDataWithOwnerData,
			};
		},
	);

	// TODO : figure out how to do this in supabase , and change this to next api
	const finalPublicFilteredData = finalDataWithCollab?.filter((item) => {
		const userCollabData = find(
			item?.collabData,
			(collabItem) => collabItem?.userEmail === userEmail,
		);
		// if logged-in user is a collaborator for this category, then return the category
		if (!isEmpty(userCollabData) && userCollabData?.isOwner === false) {
			return item;
		}

		// only return public categories that is created by logged in user
		if (!(item?.is_public === true && item?.user_id?.id !== userId)) {
			return item;
		}

		return null;
	}) as CategoriesData[];

	// else if (isEmpty(finalPublicFilteredData)) {
	//   response.status(500).json({
	//     data: null,
	//     error: { message: 'Something went wrong , check RLS' },
	//   });
	// }
	if (!isNull(error)) {
		response.status(500).json({ data: null, error });
	} else {
		response.status(200).json({ data: finalPublicFilteredData, error: null });
	}
}
