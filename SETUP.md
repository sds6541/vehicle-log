# 법인차량 운행일지 — 설치 및 배포 가이드

## 개요
Supabase(데이터베이스) + Vercel(호스팅)을 사용하는 법인차량 운행일지 웹앱입니다.
직원은 링크로 접속해 운행 내역을 입력하고, 관리자는 전체 기록을 조회·CSV 내보내기할 수 있습니다.

---

## STEP 1. Supabase 데이터베이스 설정

### 1-1. 계정 및 프로젝트 생성
1. https://supabase.com 접속 → 무료 계정 가입
2. **New Project** 클릭
3. 프로젝트명 입력 (예: `vehicle-log`)
4. 데이터베이스 비밀번호 설정 (어딘가에 메모해두세요)
5. 리전: **Northeast Asia (Tokyo)** 선택 → **Create new project**

### 1-2. 테이블 생성
1. 좌측 메뉴 **SQL Editor** 클릭
2. **New query** 클릭 후 아래 SQL 전체 복사/붙여넣기

```sql
-- 운행일지 테이블 생성
CREATE TABLE vehicle_logs (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  date        DATE NOT NULL,
  driver      TEXT NOT NULL,
  car_num     TEXT NOT NULL,
  start_time  TEXT,
  end_time    TEXT,
  from_location TEXT NOT NULL,
  to_location   TEXT NOT NULL,
  start_km    NUMERIC,
  end_km      NUMERIC,
  distance    NUMERIC,
  purpose     TEXT NOT NULL,
  note        TEXT
);

-- RLS 활성화
ALTER TABLE vehicle_logs ENABLE ROW LEVEL SECURITY;

-- 누구나 입력 가능 (직원이 로그인 없이 기록)
CREATE POLICY "public_insert" ON vehicle_logs
  FOR INSERT TO anon WITH CHECK (true);

-- 누구나 조회 가능 (앱 레벨에서 관리자 비밀번호로 보호)
CREATE POLICY "public_select" ON vehicle_logs
  FOR SELECT TO anon USING (true);

-- 삭제도 허용 (관리자 화면에서만 사용)
CREATE POLICY "public_delete" ON vehicle_logs
  FOR DELETE TO anon USING (true);
```

3. **Run** 버튼 클릭 → "Success" 확인

### 1-3. API 키 확인
1. 좌측 메뉴 **Settings → API**
2. **Project URL** 복사 → 나중에 사용
3. **anon public** 키 복사 → 나중에 사용

---

## STEP 2. GitHub에 코드 올리기

1. https://github.com 계정 생성 (없다면)
2. **New repository** → 이름 입력 (예: `vehicle-log`) → Public → **Create**
3. 이 프로젝트 폴더를 해당 저장소에 업로드
   - 간단한 방법: GitHub 저장소 페이지에서 **uploading an existing file** 클릭 → 폴더 안 파일들 전체 드래그앤드롭

---

## STEP 3. Vercel 배포

1. https://vercel.com 접속 → GitHub 계정으로 가입/로그인
2. **Add New → Project** → GitHub 저장소 연결
3. 해당 저장소 선택 → **Import**
4. **Environment Variables** 섹션에서 아래 3개 추가:

   | 이름 | 값 |
   |------|-----|
   | `VITE_SUPABASE_URL` | Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anon public 키 |
   | `VITE_ADMIN_PASSWORD` | 원하는 관리자 비밀번호 |

5. **Deploy** 클릭 → 1~2분 후 배포 완료
6. 생성된 URL (예: `https://vehicle-log-xxx.vercel.app`) 직원들에게 공유

---

## STEP 4. 직원 배포

완성된 Vercel URL을 카카오톡/문자로 공유하면 됩니다.
- 별도 앱 설치 불필요
- 스마트폰/PC 모두 접속 가능
- 북마크 추가 권장

---

## 관리자 비밀번호 변경

Vercel → 해당 프로젝트 → **Settings → Environment Variables**에서
`VITE_ADMIN_PASSWORD` 값을 변경한 뒤 **Redeploy**하면 즉시 적용됩니다.

---

## 문의

앱 수정이 필요하면 Claude에게 코드를 보여주고 요청하시면 됩니다.
