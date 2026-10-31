import prisma from '../lib/prisma.js';
import { FormBuilderValidationError } from '../lib/formBuilderValidation.js';

const listSelect = {
  id: true,
  formKey: true,
  title: true,
  clientName: true,
  status: true,
  revision: true,
  schemaVersion: true,
  createdAt: true,
  updatedAt: true,
};

const detailSelect = {
  ...listSelect,
  data: true,
};

export async function listFormBuilderRecords({
  userId,
  formKey,
  q,
  limit,
  offset,
}) {
  const where = {
    userId,
    isDeleted: false,
  };

  if (formKey) where.formKey = formKey;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { clientName: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [records, total] = await prisma.$transaction([
    prisma.formBuilderRecord.findMany({
      where,
      select: listSelect,
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.formBuilderRecord.count({ where }),
  ]);

  return { records, total };
}

export async function getFormBuilderRecord({ userId, id }) {
  return prisma.formBuilderRecord.findFirst({
    where: {
      id,
      userId,
      isDeleted: false,
    },
    select: detailSelect,
  });
}

export async function createFormBuilderRecord({ userId, payload }) {
  return prisma.formBuilderRecord.create({
    data: {
      userId,
      formKey: payload.formKey,
      title: payload.title,
      clientName: payload.clientName,
      status: payload.status || 'DRAFT',
      data: payload.data,
      schemaVersion: 1,
    },
    select: detailSelect,
  });
}

export async function updateFormBuilderRecord({ userId, id, payload }) {
  const existing = await prisma.formBuilderRecord.findFirst({
    where: {
      id,
      userId,
      isDeleted: false,
    },
    select: { formKey: true },
  });

  if (!existing) return { notFound: true };

  if (existing.formKey !== payload.formKey) {
    throw new FormBuilderValidationError('The form type cannot be changed');
  }

  const result = await prisma.formBuilderRecord.updateMany({
    where: {
      id,
      userId,
      isDeleted: false,
      revision: payload.revision,
    },
    data: {
      title: payload.title,
      clientName: payload.clientName,
      ...(payload.status ? { status: payload.status } : {}),
      data: payload.data,
      revision: { increment: 1 },
    },
  });

  if (result.count === 0) {
    const current = await prisma.formBuilderRecord.findFirst({
      where: {
        id,
        userId,
        isDeleted: false,
      },
      select: { revision: true },
    });

    if (!current) return { notFound: true };

    return { conflict: true, currentRevision: current.revision };
  }

  const record = await getFormBuilderRecord({ userId, id });
  return { record };
}

export async function deleteFormBuilderRecord({ userId, id }) {
  const result = await prisma.formBuilderRecord.updateMany({
    where: {
      id,
      userId,
      isDeleted: false,
    },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  return result.count > 0;
}
