import { renderIcon } from "@/lib/icon-art";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ size: "192" }, { size: "512" }, { size: "maskable" }];
}

export async function GET(_req: Request, ctx: RouteContext<"/icons/[size]">) {
  const { size } = await ctx.params;
  if (size === "maskable") return renderIcon(512, 0.2);
  if (size === "192") return renderIcon(192, 0.14);
  return renderIcon(512, 0.14);
}
