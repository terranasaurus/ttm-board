<<<<<<< HEAD
import type { GetServerSideProps } from "next";

// TTM Portal: Kan's public OSS friends page is not used. Everyone goes to
// /login, which forwards signed-in users to /boards.
export const getServerSideProps: GetServerSideProps = () =>
  Promise.resolve({ redirect: { destination: "/login", permanent: false } });

export default function OSSFriends() {
  return null;
=======
import type { GetStaticProps } from "next";

import type { OSSFriend } from "~/views/oss-friends";
import OSSFriendsView from "~/views/oss-friends";

export const getStaticProps: GetStaticProps<{
  ossFriends: OSSFriend[];
}> = async () => {
  try {
    const response = await fetch("https://formbricks.com/api/oss-friends");
    if (!response.ok) throw new Error(`Formbricks returned ${response.status}`);
    const { data } = (await response.json()) as { data: OSSFriend[] };
    return { props: { ossFriends: data }, revalidate: 60 * 60 * 24 };
  } catch {
    return { props: { ossFriends: [] }, revalidate: 60 };
  }
};

export default function OSSFriends({
  ossFriends,
}: {
  ossFriends: OSSFriend[];
}) {
  return <OSSFriendsView ossFriends={ossFriends} />;
>>>>>>> upstream/main
}
