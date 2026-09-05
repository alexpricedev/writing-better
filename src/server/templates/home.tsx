import { Layout } from "@server/components/layouts";
import { SITE_DESCRIPTION, SITE_NAME } from "@server/services/seo";

export const Home = () => (
  <Layout
    title={SITE_NAME}
    description={SITE_DESCRIPTION}
    canonicalPath="/"
    name="home"
  >
    <section className="home">
      <h1>{SITE_NAME}</h1>
      <p className="lead">{SITE_DESCRIPTION}</p>
    </section>
  </Layout>
);
