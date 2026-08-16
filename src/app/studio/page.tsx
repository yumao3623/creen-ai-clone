import { GenerateControl } from "@/features/studio/generate-control";
import { getAuthenticatedUser } from "@/integrations/supabase/server";
import { noIndexMetadata } from "@/lib/seo";
import Image from "next/image";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function StudioPage() {
  const { user } = await getAuthenticatedUser();

  return (
    <main className="studio-page" id="main-content" tabIndex={-1}>
      <section className="studio-shell" aria-labelledby="studio-title">
        <div className="studio-shell__heading">
          <p className="eyebrow">STUDIO</p>
          <h1 id="studio-title">建立下一幅画面</h1>
          <p>
            Image、Video 和 Audio 独立工作。游客可以浏览和填写输入；真实
            Generate 前会验证登录、输入和 Credits Quote。
          </p>
        </div>

        <div className="studio-showcase" aria-hidden="true">
          <Image
            alt=""
            className="studio-showcase__card studio-showcase__card--left"
            fill
            priority
            sizes="(max-width: 48rem) 54vw, 19vw"
            src="/media/phase11-gallery-animal.jpg"
          />
          <Image
            alt=""
            className="studio-showcase__card studio-showcase__card--center"
            fill
            priority
            sizes="(max-width: 48rem) 54vw, 22vw"
            src="/media/phase11-gallery-fashion.jpg"
          />
          <Image
            alt=""
            className="studio-showcase__card studio-showcase__card--right"
            fill
            priority
            sizes="(max-width: 48rem) 54vw, 19vw"
            src="/media/phase11-gallery-sunrise-landscape.jpg"
          />
        </div>

        <GenerateControl authenticated={Boolean(user)} />
      </section>
    </main>
  );
}
