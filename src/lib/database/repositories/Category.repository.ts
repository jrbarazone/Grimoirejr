import { serializeCategory } from '$lib/utils/serialize-dbo-entity';
import { and, asc, count, desc, eq } from 'drizzle-orm';

import { db } from '../db';
import { categorySchema } from '../schema';
import { mapRelationsToWithStatements } from './common';

import type { Category } from '$lib/types/Category.type';
import type { CategoryDbo } from '$lib/types/dbo/CategoryDbo.type';

enum CategoryRelations {
	OWNER = 'owner',
	PARENT = 'parent'
}
const allCategoryRelations: CategoryRelations[] = Object.values(CategoryRelations);

export const getCategoryById = async (
	id: number,
	ownerId: number,
	relations: CategoryRelations[] = allCategoryRelations
): Promise<Category | null> => {
	const category = await db.query.categorySchema.findFirst({
		where: and(eq(categorySchema.id, id), eq(categorySchema.ownerId, ownerId)),
		with: mapRelationsToWithStatements(relations)
	});

	return category ? serializeCategory(category) : null;
};

const orderKeys = {
	created: categorySchema.created,
	name: categorySchema.name,
	slug: categorySchema.slug
};

export const getCategoriesByUserId = async (
	userId: number,
	options?: {
		orderBy?: keyof typeof orderKeys;
		orderDirection?: 'asc' | 'desc';
		limit?: number;
		page?: number;
	},
	relations: CategoryRelations[] = allCategoryRelations
): Promise<Category[]> => {
	const categories = await db.query.categorySchema.findMany({
		limit: options?.limit,
		offset: options?.page && options?.limit && (options.page - 1) * options.limit,
		orderBy:
			options?.orderBy &&
			(options.orderDirection === 'asc'
				? asc(orderKeys[options.orderBy])
				: desc(orderKeys[options.orderBy])),
		where: eq(categorySchema.ownerId, userId),
		with: mapRelationsToWithStatements(relations)
	});

	return categories.map(serializeCategory);
};

export const createCategory = async (
	categoryData: typeof categorySchema.$inferInsert
): Promise<Category> => {
	const [category]: CategoryDbo[] = await db
		.insert(categorySchema)
		.values(categoryData)
		.returning();

	return serializeCategory(category);
};

export const updateCategory = async (
	id: number,
	ownerId: number,
	categoryData: Partial<typeof categorySchema.$inferInsert>
): Promise<Category> => {
	const [category]: CategoryDbo[] = await db
		.update(categorySchema)
		.set(categoryData)
		.where(and(eq(categorySchema.id, id), eq(categorySchema.ownerId, ownerId)))
		.returning();

	return serializeCategory(category);
};

export const deleteCategory = async (id: number, ownerId: number): Promise<void> => {
	await db
		.delete(categorySchema)
		.where(and(eq(categorySchema.id, id), eq(categorySchema.ownerId, ownerId)));
};

export const fetchCategoryCountByUserId = async (userId: number): Promise<number> => {
	const [{ count: categoryCount }] = await db
		.select({ count: count(categorySchema.id) })
		.from(categorySchema)
		.where(eq(categorySchema.ownerId, userId));

	return categoryCount;
};
