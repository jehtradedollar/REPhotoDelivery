import assert from "node:assert/strict";
import { test } from "node:test";
import { embedInfo } from "../src/lib/embeds";
import { toE164 } from "../src/lib/integrations/sms";
import { parseStagingResponse } from "../src/lib/integrations/staging";
import { downloadHref, mlsFilename, projectZipHref } from "../src/lib/links";
import { fill } from "../src/lib/fill";

test("embedInfo turns share links into players", () => {
  assert.deepEqual(embedInfo("https://www.youtube.com/watch?v=abc123"), { provider: "YouTube", embedUrl: "https://www.youtube-nocookie.com/embed/abc123" });
  assert.deepEqual(embedInfo("https://youtu.be/xyz"), { provider: "YouTube", embedUrl: "https://www.youtube-nocookie.com/embed/xyz" });
  assert.deepEqual(embedInfo("https://vimeo.com/76979871"), { provider: "Vimeo", embedUrl: "https://player.vimeo.com/video/76979871" });
  assert.equal(embedInfo("https://my.matterport.com/show/?m=SxQL3iGyoDo").provider, "Matterport");
  assert.equal(embedInfo("http://vimeo.com/1").embedUrl, null, "plain http is never embedded");
  assert.equal(embedInfo("https://example.com/page").embedUrl, null);
});

test("toE164 normalizes US numbers and rejects junk", () => {
  assert.equal(toE164("(530) 555-0142"), "+15305550142");
  assert.equal(toE164("1-530-555-0142"), "+15305550142");
  assert.equal(toE164("+44 20 7946 0958"), "+442079460958");
  assert.equal(toE164("555-0142"), null);
});

test("fill replaces known placeholders and leaves unknown ones", () => {
  assert.equal(fill("Hi {agent_first_name}, {address} is ready {nope}", { agent_first_name: "Maya", address: "1 Main" }), "Hi Maya, 1 Main is ready {nope}");
});

test("download links carry the delivery token and MLS choice", () => {
  assert.equal(downloadHref("med_1"), "/api/download/med_1");
  assert.equal(downloadHref("med_1", { token: "abc", mls: true }), "/api/download/med_1?t=abc&v=mls");
  assert.equal(projectZipHref("prj_1", { mls: true }), "/api/download/project/prj_1?v=mls");
  assert.equal(mlsFilename("IMG_0042.dng"), "IMG_0042-MLS.jpg");
});

test("parseStagingResponse understands common vendor shapes", () => {
  assert.deepEqual(parseStagingResponse({ id: "j1", status: "processing" }), { status: "processing", jobId: "j1" });
  assert.deepEqual(parseStagingResponse({ id: "j1", status: "completed", result_url: "https://x/y.jpg" }), { status: "done", jobId: "j1", outputUrl: "https://x/y.jpg" });
  assert.equal(parseStagingResponse({ id: "j1", status: "failed", error: "bad" }).status, "failed");
  assert.equal(parseStagingResponse({}).status, "failed");
});
