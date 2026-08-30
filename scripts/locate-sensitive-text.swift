import Foundation
import Vision
import AppKit

for path in CommandLine.arguments.dropFirst() {
    guard let image = NSImage(contentsOfFile: path),
          let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { continue }
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["en-US"]
    request.usesLanguageCorrection = false
    do { try VNImageRequestHandler(cgImage: cg).perform([request]) } catch { print(error); continue }
    print(path)
    for result in request.results ?? [] {
        guard let text = result.topCandidates(1).first?.string else { continue }
        if ["70", "200", "+8", "+5", "+9", "+6", "5K", "35K", "16%"].contains(where: text.contains) {
            let b = result.boundingBox
            print(text, "x=\(Int(b.minX * CGFloat(cg.width))) y=\(Int((1-b.maxY) * CGFloat(cg.height))) w=\(Int(b.width * CGFloat(cg.width))) h=\(Int(b.height * CGFloat(cg.height)))")
        }
    }
}
