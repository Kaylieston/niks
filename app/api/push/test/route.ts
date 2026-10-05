import { NextResponse } from "next/server";
import { sendToAll } from "@/lib/push";

export async function POST() {
  try {
    const res = await sendToAll({
      title: "Niks 🌸",
      body: "Thông báo thử — nếu bạn thấy dòng này thì nhắc nhở buổi tối đã chạy được.",
      url: "/",
    });
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
