import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { costOfGoodsSold, handlingFees, miscFees } = await request.json();
    const productId = params.id;

    const updateData: any = {};
    if (costOfGoodsSold !== undefined) updateData.costOfGoodsSold = costOfGoodsSold;
    if (handlingFees !== undefined) updateData.handlingFees = handlingFees;
    if (miscFees !== undefined) updateData.miscFees = miscFees;

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Failed to update product costs:', error);
    return NextResponse.json(
      { error: 'Failed to update product costs' },
      { status: 500 }
    );
  }
} 