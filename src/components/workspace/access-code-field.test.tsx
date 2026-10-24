import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccessCodeField } from "@/components/workspace/access-code-field";
import { accessibleText } from "@/test/markup";

const props = { id: "debug-access-code", value: "", onValueChange: () => {}, onChange: () => {} };

describe("AccessCodeField", () => {
  it("asks for the code in a labelled password field when none is saved", () => {
    const html = renderToStaticMarkup(<AccessCodeField {...props} showField />);
    expect(html).toMatch(/<label[^>]*for="debug-access-code"[^>]*>Access code/);
    expect(html).toMatch(/<input id="debug-access-code" aria-describedby="debug-access-code-hint" type="password"/);
    expect(html).toContain('autoComplete="off"');
  });

  it("links an error to the field", () => {
    const html = renderToStaticMarkup(<AccessCodeField {...props} showField error="That access code wasn’t accepted." />);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="debug-access-code-error debug-access-code-hint"');
    expect(accessibleText(html)).toContain("That access code wasn’t accepted.");
  });

  it("shows the saved state with a Change button instead of the field", () => {
    const html = renderToStaticMarkup(<AccessCodeField {...props} showField={false} />);
    expect(accessibleText(html)).toContain("Access code saved for this tab");
    expect(html).toMatch(/<button type="button"[^>]*>Change<\/button>/);
    expect(html).not.toContain("<input");
  });
});
