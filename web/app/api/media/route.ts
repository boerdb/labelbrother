import { LABEL_SIZES } from "@/lib/labelSizes";

export const dynamic = "force-static";

export async function GET() {
  return Response.json({
    labels: Object.values(LABEL_SIZES),
  });
}
