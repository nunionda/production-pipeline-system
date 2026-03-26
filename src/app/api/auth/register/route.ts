import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";

// POST /api/auth/register — 사용자 등록 (사내 시스템, 관리자가 등록)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, password, role } = body;

  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json(
      { error: "이름, 이메일, 비밀번호는 필수입니다" },
      { status: 400 }
    );
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "이미 등록된 이메일입니다" },
      { status: 409 }
    );
  }

  const hashedPassword = await hash(password, 12);
  const user = await db.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      hashedPassword,
      role: role || "STAFF",
    },
  });

  return NextResponse.json(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    { status: 201 }
  );
}
