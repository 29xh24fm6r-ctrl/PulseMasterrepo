import { auth } from "@clerk/nextjs/server";
import NewsReviewPage from "@/components/news/news-review-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewsPage() {
  const { userId } = await auth();
  if (!userId) {
    return <div className="p-8">Please sign in to view news suggestions.</div>;
  }

  return <NewsReviewPage />;
}

