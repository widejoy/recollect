// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { log } from "console";
import { type NextApiResponse } from "next";
import {
	type PostgrestError,
	type PostgrestResponse,
} from "@supabase/supabase-js";
import { isEmpty } from "lodash";
import isNull from "lodash/isNull";

import {
	type CategoriesData,
	type DeleteUserCategoryApiPayload,
	type NextApiRequest,
	type ProfilesTableTypes,
} from "../../../types/apiTypes";
import {
	CATEGORIES_TABLE_NAME,
	MAIN_TABLE_NAME,
	PROFILES,
	SHARED_CATEGORIES_TABLE_NAME,
} from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

type Data = {
	data: CategoriesData[] | null;
	error:
		| PostgrestError
		| string
		| { dbErrorMessage?: PostgrestError; message: string }
		| null;
};

/**
 * Deletes catagory for a user
 */

// eslint-disable-next-line complexity
export default async function handler(
	request: NextApiRequest<DeleteUserCategoryApiPayload>,
	response: NextApiResponse<Data>,
) {
	const supabase = apiSupabaseClient(request, response);

	const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;

	const {
		data: categoryData,
		error: categoryDataError,
	}: PostgrestResponse<{ user_id: ProfilesTableTypes["id"] }> = await supabase
		.from(CATEGORIES_TABLE_NAME)
		.select(`user_id`)
		.eq("id", request.body.category_id);

	if (
		!isNull(categoryDataError) &&
		isEmpty(categoryData) &&
		isNull(categoryData)
	) {
		response.status(500).json({
			data: null,
			error: {
				message: `error in getting category data`,
				dbErrorMessage: categoryDataError,
			},
		});
		throw new Error("ERROR");
	}

	// deletes any the category in shared collabs table
	// when the category is deleted then all the collab users will also have the category deleted
	// but this should only happen if the owner deletes the category

	// this tells if the person deleting the category is the owner of the category
	const isDelTriggerUserTheOwner = !isNull(categoryData)
		? categoryData[0]?.user_id === userId
		: false;

	if (!isDelTriggerUserTheOwner) {
		response.status(500).json({
			data: null,
			error: {
				message: `Only collection owner can delete this collection`,
			},
		});
		throw new Error("ERROR");
	}

	// deleting all its associations in shared_category table
	const { data: sharedCategoryData, error: sharedCategoryError } =
		await supabase
			.from(SHARED_CATEGORIES_TABLE_NAME)
			.delete()
			.match({ category_id: request.body.category_id, user_id: userId });

	if (!isNull(sharedCategoryError)) {
		response.status(500).json({
			data: null,
			error: {
				message: `error on deleting associations in shared_category table`,
				dbErrorMessage: sharedCategoryError,
			},
		});
		throw new Error("ERROR");
	}

	if (
		isNull(sharedCategoryError) &&
		!isEmpty(sharedCategoryData) &&
		!isNull(sharedCategoryData)
	) {
		log(
			`have deleted this category_id in shared_category table: `,
			request.body.category_id,
		);
	}

	// if bookmarks from the del category is in trash
	// then we need to set the category id of the bookmark to uncategorized

	const { data: trashData, error: trashDataError } = await supabase
		.from(MAIN_TABLE_NAME)
		.update({
			category_id: 0,
		})
		.match({ category_id: request.body.category_id, trash: true })
		.select(`id`);

	if (!isNull(trashDataError)) {
		response.status(500).json({
			data: null,
			error: {
				message: `error on updating all trash bookmarks to uncategorized`,
				dbErrorMessage: trashDataError,
			},
		});
		throw new Error("ERROR");
	}

	if (!isEmpty(trashData)) {
		log(`Updated trash bookmarks to uncategorized`, trashData);
	}

	const { data, error }: PostgrestResponse<CategoriesData> = await supabase
		.from(CATEGORIES_TABLE_NAME)
		.delete()
		.eq("id", request.body.category_id)
		.eq("user_id", userId)
		.select(`*`);

	if (isNull(data)) {
		response.status(500).json({ data: null, error });
		throw new Error("ERROR");
	}

	if (
		data &&
		!isEmpty(data) &&
		!isNull(request.body.category_order) &&
		request.body.category_order &&
		!isNull(data)
	) {
		// updates user category order
		const { error: orderError } = await supabase
			.from(PROFILES)
			.update({
				category_order: request.body.category_order?.filter(
					(item: number) => item !== data[0]?.id,
				),
			})
			.match({ id: userId }).select(`
      id, category_order`);

		if (!isNull(orderError)) {
			response.status(500).json({ data: null, error: orderError });
			throw new Error("ERROR");
		}
	}

	if (!isNull(error)) {
		response.status(500).json({ data: null, error });
		throw new Error("ERROR");
	} else if (isEmpty(data) || isNull(data)) {
		response
			.status(500)
			.json({ data: null, error: { message: "Something went wrong" } });
		throw new Error("ERROR");
	} else {
		response.status(200).json({ data, error: null });
	}
}
