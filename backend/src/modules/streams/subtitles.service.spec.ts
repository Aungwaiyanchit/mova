import { convertSrtToVtt } from "./subtitles.service";

describe("subtitle helpers", () => {
  it("converts SRT timestamps to WebVTT", () => {
    expect(convertSrtToVtt("1\r\n00:00:01,250 --> 00:00:03,500\r\nHello\r\n")).toBe(
      "WEBVTT\n\n1\n00:00:01.250 --> 00:00:03.500 line:90% position:50% align:center\nHello\n",
    );
  });

  it("preserves existing WebVTT files", () => {
    expect(convertSrtToVtt("WEBVTT\n\n00:01.000 --> 00:02.000\nHello")).toBe(
      "WEBVTT\n\n00:01.000 --> 00:02.000 line:90% position:50% align:center\nHello",
    );
  });

  it("preserves an explicit cue line position", () => {
    expect(convertSrtToVtt("WEBVTT\n\n00:01.000 --> 00:02.000 line:20%\nHello")).toContain(
      "00:01.000 --> 00:02.000 line:20%",
    );
  });
});
