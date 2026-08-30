import Foundation
import AppKit
import CoreGraphics
import CoreText
import ImageIO
import UniformTypeIdentifiers

struct Edit { let x, y, w, h: CGFloat; let text: String; let size: CGFloat; let fg, bg: NSColor }

let white = NSColor(calibratedWhite: 1, alpha: 1)
let gray = NSColor(calibratedWhite: 0.94, alpha: 1)
let paleRed = NSColor(calibratedRed: 0.96, green: 0.84, blue: 0.82, alpha: 1)
let red = NSColor(calibratedRed: 0.64, green: 0.08, blue: 0.05, alpha: 1)

let jobs: [(String, [Edit])] = [
  ("public/portfolio/work/campaign-detail.jpg", [
    Edit(x: 1021, y: 613, w: 55, h: 29, text: "XX%", size: 22, fg: .black, bg: white),
  ]),
  ("public/portfolio/work/campaign-review-2.jpg", [
    Edit(x: 258, y: 439, w: 52, h: 28, text: "+XX%", size: 22, fg: red, bg: paleRed),
    Edit(x: 258, y: 665, w: 52, h: 28, text: "+XX%", size: 22, fg: red, bg: paleRed),
    Edit(x: 638, y: 301, w: 52, h: 28, text: "+XX%", size: 22, fg: red, bg: paleRed),
    Edit(x: 641, y: 615, w: 55, h: 28, text: "+XX%", size: 22, fg: red, bg: paleRed),
    Edit(x: 1196, y: 726, w: 120, h: 28, text: "<XXX SKU", size: 21, fg: .black, bg: gray),
  ]),
  ("public/portfolio/work/campaign-review.jpg", [
    Edit(x: 1052, y: 437, w: 160, h: 28, text: "品上架 XX>XX", size: 21, fg: .black, bg: gray),
    Edit(x: 1629, y: 437, w: 61, h: 28, text: "+XX%", size: 21, fg: .black, bg: gray),
  ]),
]

for (path, edits) in jobs {
  guard let image = NSImage(contentsOfFile: path),
        let source = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { fatalError(path) }
  let width = source.width, height = source.height
  let colorSpace = CGColorSpaceCreateDeviceRGB()
  guard let ctx = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8,
                            bytesPerRow: width * 4, space: colorSpace,
                            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { fatalError("context") }
  ctx.draw(source, in: CGRect(x: 0, y: 0, width: width, height: height))
  ctx.setAllowsAntialiasing(true)
  ctx.setShouldAntialias(true)
  for e in edits {
    let bottomY = CGFloat(height) - e.y - e.h
    ctx.setFillColor(e.bg.cgColor)
    ctx.fill(CGRect(x: e.x, y: bottomY, width: e.w, height: e.h))
    let font = CTFontCreateWithName("Arial-BoldMT" as CFString, e.size, nil)
    let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: e.fg]
    let line = CTLineCreateWithAttributedString(NSAttributedString(string: e.text, attributes: attrs))
    let bounds = CTLineGetBoundsWithOptions(line, [.useGlyphPathBounds])
    let tx = e.x + max(0, (e.w - bounds.width) / 2) - bounds.minX
    let ty = bottomY + max(0, (e.h - bounds.height) / 2) - bounds.minY
    ctx.textPosition = CGPoint(x: tx, y: ty)
    CTLineDraw(line, ctx)
  }
  guard let out = ctx.makeImage(), let destination = CGImageDestinationCreateWithURL(URL(fileURLWithPath: path) as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else { fatalError("output") }
  CGImageDestinationAddImage(destination, out, [kCGImageDestinationLossyCompressionQuality: 0.94] as CFDictionary)
  guard CGImageDestinationFinalize(destination) else { fatalError("write") }
}
