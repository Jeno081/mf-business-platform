import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import type { Response } from 'express';
import { prisma } from '@mf/database';

const INK = '#111111';
const MUTED = '#77736b';
const LINE = '#ded9ce';
const CREAM = '#f4f0e8';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  PREPARING: 'En préparation',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
  REFUNDED: 'Remboursée',
};

const PAYMENT_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  AUTHORIZED: 'Autorisé',
  PAID: 'Payé',
  FAILED: 'Échec',
  REFUNDED: 'Remboursé',
  PARTIALLY_REFUNDED: 'Partiellement remboursé',
};

function money(value: number | { toString(): string }): string {
  const amount = typeof value === 'number' ? value : Number(value.toString());
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(amount)} $`;
}

function date(value: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function logoPath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'apps/api/assets/logo-monogram.png'),
    path.resolve(__dirname, '../../assets/logo-monogram.png'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function addressLines(order: {
  shippingAddress: unknown;
}): string[] {
  const address = order.shippingAddress as
    | { recipient?: string; city?: string; commune?: string; address?: string; phone?: string }
    | null;
  if (!address) return [];
  return [
    address.recipient ?? '',
    [address.address, address.commune].filter(Boolean).join(', '),
    [address.city, 'RDC'].filter(Boolean).join(', '),
    address.phone ? `Tél. ${address.phone}` : '',
  ].filter(Boolean);
}

export async function streamInvoice(orderId: string, res: Response, download = false) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { orderBy: { id: 'asc' } },
      payments: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  if (!order) throw new Error('Commande introuvable.');

  const invoiceNumber = `FAC-${order.orderNumber}`;
  const filename = `${invoiceNumber}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
  );
  const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: invoiceNumber } });
  doc.pipe(res);

  const logo = logoPath();
  if (logo) {
    doc.image(logo, 50, 42, { width: 46, height: 46 });
  }
  doc
    .fillColor(INK)
    .font('Helvetica-Bold')
    .fontSize(18)
    .text('MAISON FORLIFE', 108, 48, { characterSpacing: 1.5 })
    .font('Helvetica')
    .fontSize(7)
    .fillColor(MUTED)
    .text('B U S I N E S S   ·   K I N S H A S A', 109, 72, { characterSpacing: 0.8 });

  doc
    .fillColor(INK)
    .font('Helvetica-Bold')
    .fontSize(26)
    .text('FACTURE', 50, 115, { align: 'right' })
    .font('Helvetica')
    .fontSize(9)
    .fillColor(MUTED)
    .text(invoiceNumber, 50, 145, { align: 'right' })
    .text(date(order.createdAt), 50, 158, { align: 'right' });

  doc
    .moveTo(50, 185)
    .lineTo(545, 185)
    .strokeColor(LINE)
    .lineWidth(1)
    .stroke();

  doc
    .fillColor(MUTED)
    .font('Helvetica-Bold')
    .fontSize(7)
    .text('FACTURÉ À', 50, 205, { characterSpacing: 1 })
    .fillColor(INK)
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(order.customerName, 50, 220)
    .font('Helvetica')
    .fontSize(9)
    .fillColor(MUTED);

  const lines = addressLines(order);
  lines.forEach((line, index) => doc.text(line, 50, 238 + index * 13));

  doc
    .fillColor(MUTED)
    .font('Helvetica-Bold')
    .fontSize(7)
    .text('DÉTAILS', 330, 205, { characterSpacing: 1 })
    .font('Helvetica')
    .fontSize(9)
    .fillColor(INK)
    .text(`Commande : ${order.orderNumber}`, 330, 220)
    .text(`Statut : ${STATUS_LABELS[order.status] ?? order.status}`, 330, 235)
    .text(`Paiement : ${PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}`, 330, 250);

  let y = 315;
  doc.rect(50, y, 495, 24).fill(CREAM);
  doc
    .fillColor(MUTED)
    .font('Helvetica-Bold')
    .fontSize(7)
    .text('PRODUIT', 60, y + 8)
    .text('QTÉ', 365, y + 8, { width: 30, align: 'right' })
    .text('PRIX UNITAIRE', 405, y + 8, { width: 65, align: 'right' })
    .text('TOTAL', 480, y + 8, { width: 55, align: 'right' });

  y += 32;
  for (const item of order.items) {
    if (y > 680) {
      doc.addPage();
      y = 60;
    }
    doc
      .fillColor(INK)
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(item.productName, 60, y, { width: 290 })
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(MUTED)
      .text(
        [item.variantLabel, item.sku ? `Réf. ${item.sku}` : ''].filter(Boolean).join(' · '),
        60,
        y + 13,
        { width: 290 },
      )
      .fillColor(INK)
      .fontSize(9)
      .text(String(item.quantity), 365, y, { width: 30, align: 'right' })
      .text(money(item.unitPrice), 405, y, { width: 65, align: 'right' })
      .text(money(item.lineTotal), 480, y, { width: 55, align: 'right' });
    y += 37;
    doc.moveTo(50, y - 8).lineTo(545, y - 8).strokeColor(LINE).lineWidth(0.5).stroke();
  }

  y += 10;
  const totalsX = 365;
  doc.font('Helvetica').fontSize(9).fillColor(MUTED);
  doc.text('Sous-total', totalsX, y, { width: 110 });
  doc.fillColor(INK).text(money(order.subtotal), 480, y, { width: 55, align: 'right' });
  y += 17;
  doc.fillColor(MUTED).text('Livraison', totalsX, y, { width: 110 });
  doc.fillColor(INK).text(
    Number(order.deliveryFee) === 0 ? 'Offerte' : money(order.deliveryFee),
    480,
    y,
    { width: 55, align: 'right' },
  );
  y += 22;
  doc.moveTo(365, y - 4).lineTo(545, y - 4).strokeColor(LINE).lineWidth(0.7).stroke();
  doc.font('Helvetica-Bold').fontSize(13).fillColor(INK);
  doc.text('TOTAL', totalsX, y + 3);
  doc.text(money(order.total), 460, y + 3, { width: 75, align: 'right' });

  const footerY = 760;
  doc
    .moveTo(50, footerY)
    .lineTo(545, footerY)
    .strokeColor(LINE)
    .lineWidth(0.7)
    .stroke()
    .fillColor(MUTED)
    .font('Helvetica-Bold')
    .fontSize(7)
    .text('MAISON FORLIFE BUSINESS', 50, footerY + 12, { characterSpacing: 0.8 })
    .font('Helvetica')
    .fontSize(7)
    .text('Kinshasa, République Démocratique du Congo · +243 811 860 632', 50, footerY + 25)
    .text('jenovicmulomba@gmail.com · Livraison 24–48 h à Kinshasa', 50, footerY + 37)
    .text(
      'Document commercial généré électroniquement. TVA selon le régime applicable. Facture valable sans signature.',
      50,
      footerY + 52,
      { width: 495 },
    );

  doc.end();
}
