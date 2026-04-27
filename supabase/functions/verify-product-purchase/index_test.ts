// End-to-end test for the digital product download delivery path.
//
// This test exercises the same storage flow that `verify-product-purchase`
// runs after a paid Stripe checkout session: upload a digital file to the
// private `digital-products` bucket, create a product row pointing at it,
// then mint a signed download URL and verify the link is (a) non-empty and
// (b) actually serves the uploaded bytes.
//
// We intentionally do NOT drive a real Stripe Checkout session from here —
// Stripe payment confirmation requires a hosted browser flow and webhooks
// that cannot run inside the Deno test runner. The Stripe gate
// (`payment_status === "paid"`) is the only branch we don't cover; every
// other piece of the digital delivery path is real.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.test({
  name: "digital product purchase delivers a working signed download link",
  // Requires service-role access to upload to a private bucket and create a
  // throwaway auth user. Skip locally / in CI when the key isn't injected;
  // the Lovable-managed runner provides it automatically when available.
  ignore: !Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  fn: async () => {
  assert(SUPABASE_URL, "SUPABASE_URL must be set");

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const runId = crypto.randomUUID();
  const fileBytes = new TextEncoder().encode(
    `UPLY digital product test artifact ${runId}\nGenerated at ${new Date().toISOString()}\n`,
  );
  let createdUserId: string | null = null;
  let createdProductId: string | null = null;
  let uploadedPath: string | null = null;

  try {
    // 1. Create a throwaway buyer user (creator + buyer can be the same here —
    //    we only need a valid auth.users row so RLS-tied tables accept it).
    const buyerEmail = `e2e-buyer-${runId}@uply-test.local`;
    const { data: created, error: userErr } = await admin.auth.admin.createUser({
      email: buyerEmail,
      email_confirm: true,
      password: crypto.randomUUID(),
    });
    assertEquals(userErr, null, `createUser failed: ${userErr?.message}`);
    assert(created.user, "expected created user");
    createdUserId = created.user.id;

    // 2. Upload the digital file to the private bucket — same bucket and path
    //    convention used by Products.tsx (userId/<filename>).
    uploadedPath = `${createdUserId}/${runId}-sample.txt`;
    const { error: uploadErr } = await admin.storage
      .from("digital-products")
      .upload(uploadedPath, fileBytes, {
        contentType: "text/plain",
        upsert: false,
      });
    assertEquals(uploadErr, null, `upload failed: ${uploadErr?.message}`);

    // 3. Create the product row that references the uploaded file.
    const { data: product, error: prodErr } = await admin
      .from("products")
      .insert({
        user_id: createdUserId,
        name: `E2E Digital Product ${runId}`,
        type: "digital",
        price: 9.99,
        status: "published",
        download_url: uploadedPath,
        download_file_name: "sample.txt",
      })
      .select()
      .single();
    assertEquals(prodErr, null, `product insert failed: ${prodErr?.message}`);
    assert(product, "expected product row");
    createdProductId = product.id;

    // 4. Mint a 1-hour signed URL — the exact call verify-product-purchase
    //    makes after Stripe confirms the payment.
    const { data: signed, error: sErr } = await admin.storage
      .from("digital-products")
      .createSignedUrl(uploadedPath, 60 * 60);

    assertEquals(sErr, null, `createSignedUrl failed: ${sErr?.message}`);
    assert(signed?.signedUrl, "expected a signedUrl in response");
    assert(signed!.signedUrl.length > 0, "signed URL must be non-empty");
    assert(
      signed!.signedUrl.startsWith("http"),
      `signed URL should be absolute, got: ${signed!.signedUrl}`,
    );

    // 5. Fetch the signed URL and confirm it returns the file bytes —
    //    proves the buyer would actually be able to download.
    const dl = await fetch(signed!.signedUrl);
    const downloaded = await dl.text();
    assertEquals(dl.status, 200, "signed URL must return 200");
    assertEquals(
      downloaded,
      new TextDecoder().decode(fileBytes),
      "downloaded bytes must match uploaded file",
    );
  } finally {
    // Cleanup — best-effort, swallow errors so test result reflects the assertions.
    if (createdProductId) {
      await admin.from("products").delete().eq("id", createdProductId);
    }
    if (uploadedPath) {
      await admin.storage.from("digital-products").remove([uploadedPath]);
    }
    if (createdUserId) {
      await admin.auth.admin.deleteUser(createdUserId);
    }
  }
  },
});

