import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  // 无状态模式：不再从数据库加载历史
  const uiMessages: any[] = [];

  return (
    <>
      <Chat
        id={id}
        initialMessages={uiMessages}
        initialVisibilityType={"private"}
        isReadonly={false}
        autoResume={true}
      />
      <DataStreamHandler />
    </>
  );
}
