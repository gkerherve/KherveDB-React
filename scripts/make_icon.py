"""Render src-tauri/icons/icon.png: the KherveDB mark - a green tile with
an open reference handbook (data-table pages, bookmark ribbon) above the
kDB wordmark. Regenerate the platform icons afterwards with
``npx tauri icon src-tauri/icons/icon.png``.

    QT_QPA_PLATFORM=offscreen python scripts/make_icon.py
"""
from pathlib import Path

from PyQt5.QtCore import QPointF, QRectF, Qt
from PyQt5.QtGui import (QColor, QFont, QImage, QLinearGradient, QPainter,
                         QPainterPath, QPen, QPolygonF, QRadialGradient,
                         QTransform)
from PyQt5.QtWidgets import QApplication

OUT = Path(__file__).resolve().parent.parent / "src-tauri/icons/icon.png"


def paint(size: int = 1024) -> QImage:
    img = QImage(size, size, QImage.Format_ARGB32)
    img.fill(Qt.transparent)
    p = QPainter(img)
    p.setRenderHint(QPainter.Antialiasing)
    s = float(size)
    m = s * 0.05
    tile = QRectF(m, m, s - 2 * m, s - 2 * m)
    r = s * 0.2
    g = QLinearGradient(tile.topLeft(), tile.bottomLeft())
    g.setColorAt(0, QColor("#6fd4b6"))
    g.setColorAt(1, QColor("#2f8f74"))
    p.setPen(Qt.NoPen)
    p.setBrush(g)
    p.drawRoundedRect(tile, r, r)
    glow = QRadialGradient(tile.center().x(), tile.top() + tile.height() * .25,
                           tile.width() * .7)
    glow.setColorAt(0, QColor(255, 255, 255, 70))
    glow.setColorAt(1, QColor(255, 255, 255, 0))
    p.setBrush(glow)
    p.drawRoundedRect(tile, r, r)
    rim = QPen(QColor(20, 90, 70, 180))
    rim.setWidthF(s * 0.012)
    p.setPen(rim)
    p.setBrush(Qt.NoBrush)
    p.drawRoundedRect(tile, r, r)

    # open handbook
    cx, top, bot = s / 2, s * 0.17, s * 0.64
    half = s * 0.30
    ink = QColor("#123f33")
    # cover behind pages
    p.setPen(Qt.NoPen)
    p.setBrush(QColor("#145c48"))
    cover = QPainterPath()
    cover.moveTo(cx, bot + s * .035)
    cover.lineTo(cx - half - s * .03, bot + s * .005)
    cover.lineTo(cx - half - s * .03, top + s * .03)
    cover.lineTo(cx, top + s * .06)
    cover.lineTo(cx + half + s * .03, top + s * .03)
    cover.lineTo(cx + half + s * .03, bot + s * .005)
    cover.closeSubpath()
    p.drawPath(cover)
    for side in (-1, 1):
        page = QPainterPath()
        page.moveTo(cx, top + s * .04)
        page.cubicTo(cx + side * half * .4, top - s * .01,
                     cx + side * half * .8, top - s * .01,
                     cx + side * half, top)
        page.lineTo(cx + side * half, bot - s * .02)
        page.cubicTo(cx + side * half * .8, bot - s * .03,
                     cx + side * half * .4, bot - s * .03,
                     cx, bot + s * .01)
        page.closeSubpath()
        pg = QLinearGradient(QPointF(cx, 0), QPointF(cx + side * half, 0))
        pg.setColorAt(0, QColor("#dfe6e3"))
        pg.setColorAt(0.12, QColor("#ffffff"))
        pg.setColorAt(1, QColor("#f4f7f6"))
        p.setBrush(pg)
        p.setPen(QPen(ink, s * 0.006))
        p.drawPath(page)
        # data table on the page: heading bar, rows, column rule
        x0 = cx + side * half * 0.16
        x1 = cx + side * half * 0.86
        lo, hi = min(x0, x1), max(x0, x1)
        y = top + s * .065
        p.setPen(Qt.NoPen)
        p.setBrush(QColor(79, 190, 159))
        p.drawRoundedRect(QRectF(lo, y, hi - lo, s * .035), s * .008, s * .008)
        pen = QPen(QColor("#7d8f89"), s * 0.011)
        pen.setCapStyle(Qt.RoundCap)
        p.setPen(pen)
        y += s * .075
        col = lo + (hi - lo) * 0.32
        while y < bot - s * .06:
            p.drawLine(QPointF(lo, y), QPointF(col - s * .02, y))
            p.drawLine(QPointF(col + s * .02, y), QPointF(hi, y))
            y += s * .052
    # bookmark ribbon
    p.setPen(Qt.NoPen)
    p.setBrush(QColor("#e2343a"))
    bx = cx + half * 0.55
    rib = QPolygonF([QPointF(bx, top - s * .005), QPointF(bx + s * .05, top - s * .005),
                     QPointF(bx + s * .05, top + s * .16), QPointF(bx + s * .025, top + s * .13),
                     QPointF(bx, top + s * .16)])
    p.drawPolygon(rib)

    # wordmark
    font = QFont("Helvetica Neue")
    font.setStyleHint(QFont.SansSerif)
    font.setWeight(QFont.Black)
    font.setPixelSize(int(s * 0.2))
    path = QPainterPath()
    path.addText(0, 0, font, "kDB")
    box = path.boundingRect()
    area = QRectF(tile.x(), tile.y() + tile.height() * .72, tile.width(),
                  tile.height() * .22)
    k = min(area.width() * .78 / box.width(), area.height() * .82 / box.height())
    t = QTransform()
    t.translate(area.center().x(), area.center().y())
    t.scale(k, k)
    t.translate(-box.center().x(), -box.center().y())
    path = t.map(path)
    p.setBrush(QColor(10, 60, 45, 120))
    p.drawPath(path.translated(0, s * .012))
    p.setBrush(QColor("#ffffff"))
    p.drawPath(path)
    p.end()
    return img


if __name__ == "__main__":
    app = QApplication([])
    paint().save(str(OUT))
    print(OUT)
