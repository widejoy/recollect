// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { log } from "console";
import { type NextApiRequest, type NextApiResponse } from "next";
import { type PostgrestError } from "@supabase/supabase-js";
import isNull from "lodash/isNull";

import {
	type BookmarkViewDataTypes,
	type CategoriesData,
	type GetPublicCategoryBookmarksApiResponseType,
	type ProfilesTableTypes,
} from "../../types/apiTypes";
import { CATEGORIES_TABLE_NAME, MAIN_TABLE_NAME } from "../../utils/constants";
import { createServiceClient } from "../../utils/supabaseClient";

/**
 * gets all bookmarks in a public category
 */

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse<GetPublicCategoryBookmarksApiResponseType>,
) {
	const supabase = createServiceClient();

	// get category data
	const { data: categoryData, error: categoryError } = (await supabase
		.from(CATEGORIES_TABLE_NAME)
		.select(
			`
      user_id (
        email,
				user_name
      ),
			category_views,
			icon,
			icon_color,
			category_name, 
			is_public
    `,
		)
		.eq("category_slug", request.query.category_slug)) as unknown as {
		data: Array<{
			category_name: CategoriesData["category_name"];
			category_views: BookmarkViewDataTypes;
			icon: CategoriesData["icon"];
			icon_color: CategoriesData["icon_color"];
			is_public: CategoriesData["is_public"];
			user_id: {
				email: ProfilesTableTypes["email"];
				user_name: ProfilesTableTypes["user_name"];
			};
		}>;
		error: PostgrestError;
	};

	if (categoryData[0]?.user_id?.user_name !== request.query.user_name) {
		// this is to check if we change user name in url then this page should show 404
		// status is 200 as DB is not giving any error
		response.status(200).json({
			data: null,
			error: "username mismatch from url query",
			category_views: null,
			icon: null,
			icon_color: null,
			category_name: null,
			is_public: null,
		});

		log("username mismatch from url query");
	} else {
		const sortBy = categoryData[0]?.category_views?.sortBy;

		let query = supabase
			.from(MAIN_TABLE_NAME)
			.select("*, category_id!inner(*), user_id!inner(*)")
			.eq("category_id.category_slug", request.query.category_slug)
			// .eq('user_id.user_name', req.query.user_name) // if this is there then collabs bookmakrs are not coming
			.eq("category_id.is_public", true)
			.eq("trash", false);

		if (sortBy === "date-sort-acending") {
			query = query.order("id", { ascending: false });
		}

		if (sortBy === "date-sort-decending") {
			query = query.order("id", { ascending: true });
		}

		if (sortBy === "alphabetical-sort-acending") {
			query = query.order("title", { ascending: true });
		}

		if (sortBy === "alphabetical-sort-decending") {
			query = query.order("title", { ascending: false });
		}

		const { data, error } = (await query) as unknown as {
			data: GetPublicCategoryBookmarksApiResponseType["data"];
			error: GetPublicCategoryBookmarksApiResponseType["error"];
		};

		if (!isNull(error) || !isNull(categoryError)) {
			response.status(500).json({
				data: null,
				error,
				category_views: null,
				icon: null,
				icon_color: null,
				category_name: null,
				is_public: null,
			});
			throw new Error("ERROR: get public category bookmark error");
		} else {
			response.status(200).json({
				data,
				error: null,
				category_views: categoryData[0]?.category_views,
				icon: categoryData[0]?.icon,
				icon_color: categoryData[0]?.icon_color,
				category_name: categoryData[0]?.category_name,
				is_public: categoryData[0]?.is_public,
			});
		}
	}
}
