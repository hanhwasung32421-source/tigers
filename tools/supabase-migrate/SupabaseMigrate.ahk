#Requires AutoHotkey v2.0
#SingleInstance Force
FileEncoding "UTF-8"

; BITRABBIT Supabase 전체 이전 도구
; 원본 DB의 public 스키마(테이블 구조 + 모든 데이터 + 시퀀스 번호)를 새 Supabase DB로 통째로 복사한다.
; 원본은 읽기만 하며(pg_dump) 절대 수정하지 않는다. 필요: PostgreSQL 클라이언트(pg_dump, psql).

TMP := A_Temp "\bitrabbit_migrate"
DirCreate TMP
LOGFILE := A_ScriptDir "\migrate-log.txt"

g := Gui(, "BITRABBIT Supabase 전체 이전 도구")
g.SetFont("s10", "Malgun Gothic")
g.MarginX := 14
g.MarginY := 10

g.AddText("xm w720 cBlue", "원본(지금 쓰는 DB)의 모든 테이블/데이터를 새 Supabase DB로 통째로 복사합니다. 원본은 읽기만 하고 바꾸지 않습니다.")
g.AddText("xm y+6 w720 c808080", "접속 문자열: Supabase 프로젝트 > Connect > Session pooler(포트 5432)의 postgresql://... 전체를 붙여넣으세요. 비밀번호 자리는 아무거나 둬도 되고, 비밀번호는 아래 칸에 따로 적습니다.")

g.AddText("xm y+14", "① 원본(기존 거래소) DB 접속 문자열")
srcUri := g.AddEdit("xm w720")
g.AddText("xm y+6", "원본 DB 비밀번호 (특수문자도 그대로, URL 인코딩 불필요)")
srcPw := g.AddEdit("xm w320 Password")

g.AddText("xm y+14", "② 새 거래소 DB 접속 문자열")
dstUri := g.AddEdit("xm w720")
g.AddText("xm y+6", "새 DB 비밀번호")
dstPw := g.AddEdit("xm w320 Password")

g.AddText("xm y+14", "③ 새 홈페이지 주소 (선택 · 끝나면 열어줍니다)")
siteEdit := g.AddEdit("xm w720")

g.AddText("xm y+14", "PostgreSQL bin 폴더 (pg_dump.exe / psql.exe 가 있는 폴더)")
binEdit := g.AddEdit("xm w610", FindPgBin())
browseBtn := g.AddButton("x+8 yp-2 w100", "찾아보기")

wipeCb := g.AddCheckbox("xm y+12 Checked", "새 DB의 기존 public 테이블을 모두 지우고 복사 (새로 만든 DB면 켜두세요)")

testBtn := g.AddButton("xm y+12 w150 h36", "연결 테스트")
copyBtn := g.AddButton("x+10 w230 h36 Default", "복사 시작 (전체 이전)")

logEdit := g.AddEdit("xm y+12 w720 r15 ReadOnly")

browseBtn.OnEvent("Click", BrowseBin)
testBtn.OnEvent("Click", (*) => RunSafely(TestConnections))
copyBtn.OnEvent("Click", (*) => RunSafely(StartCopy))
g.OnEvent("Close", (*) => ExitApp())
g.Show()
return

; ───────────────────────── 화면/로그 ─────────────────────────

Log(msg) {
    line := FormatTime(, "HH:mm:ss") "  " msg
    logEdit.Value .= line "`r`n"
    SendMessage(0x115, 7, 0, logEdit)
    try FileAppend(line "`n", LOGFILE)
}

BrowseBin(*) {
    d := DirSelect("*C:\Program Files\PostgreSQL", 0, "pg_dump.exe 가 들어있는 bin 폴더를 고르세요")
    if d != ""
        binEdit.Value := d
}

SetBusy(busy) {
    testBtn.Enabled := !busy
    copyBtn.Enabled := !busy
}

RunSafely(fn) {
    SetBusy(true)
    try {
        fn()
    } catch as e {
        Log("오류: " e.Message)
        MsgBox("중단되었습니다.`n`n" e.Message, "오류", "Iconx")
    }
    SetBusy(false)
}

; ───────────────────────── 도구 ─────────────────────────

FindPgBin() {
    best := ""
    bestVer := -1
    Loop Files "C:\Program Files\PostgreSQL\*", "D" {
        if !FileExist(A_LoopFilePath "\bin\pg_dump.exe")
            continue
        v := IsNumber(A_LoopFileName) ? Number(A_LoopFileName) : 0
        if v > bestVer {
            bestVer := v
            best := A_LoopFilePath "\bin"
        }
    }
    return best
}

ParseUri(uri) {
    uri := Trim(uri)
    if !RegExMatch(uri, "i)^postgres(?:ql)?://([^:/@]+)(?::(.*))?@([^@/:?]+):(\d+)(?:/([^?\s]*))?", &m)
        return ""
    return Map("user", m[1], "host", m[3], "port", m[4], "db", (m[5] != "" ? m[5] : "postgres"))
}

ReadConn(uriEdit, label) {
    c := ParseUri(uriEdit.Value)
    if !c
        throw Error(label " 접속 문자열을 읽을 수 없습니다.`npostgresql://사용자:비밀번호@호스트:포트/DB 형식 전체를 붙여넣어 주세요.")
    if RegExMatch(c["host"], "i)^db\..+\.supabase\.co$")
        throw Error(label " 호스트가 직접 연결 주소(db.*.supabase.co)입니다. 많은 PC에서 접속이 안 됩니다.`nSupabase > Connect > Session pooler(…pooler.supabase.com:5432) 문자열을 쓰세요.")
    if c["port"] = "6543"
        throw Error(label " 포트가 6543(Transaction pooler)입니다. 전체 복사에는 Session pooler(포트 5432)를 쓰세요.")
    return c
}

ConnArgs(c) {
    return "-h " c["host"] " -p " c["port"] ' -U "' c["user"] '" -d "' c["db"] '"'
}

BinPath(name) {
    dir := RTrim(Trim(binEdit.Value), "\")
    exe := dir "\" name ".exe"
    if !FileExist(exe)
        throw Error(name ".exe 를 찾을 수 없습니다: " exe "`nPostgreSQL(Command Line Tools)을 설치하거나 bin 폴더를 지정해 주세요.")
    return exe
}

; 명령을 숨김 창으로 실행하고 출력을 파일에 모은 뒤 종료 코드를 돌려준다(그동안 창은 계속 응답한다).
RunCmd(exe, args, pw, outFile) {
    rcFile := outFile ".rc"
    try FileDelete(outFile)
    try FileDelete(rcFile)
    EnvSet "PGPASSWORD", pw
    EnvSet "PGCONNECT_TIMEOUT", "25"
    EnvSet "PGCLIENTENCODING", "UTF8"
    cmdline := A_ComSpec ' /v:on /c ""' exe '" ' args ' > "' outFile '" 2>&1 & echo !errorlevel! > "' rcFile '""'
    Run cmdline, , "Hide", &pid
    while ProcessExist(pid)
        Sleep 150
    EnvSet "PGPASSWORD", ""
    if !FileExist(rcFile)
        return 1
    try
        return Integer(Trim(FileRead(rcFile, "CP0"), " `t`r`n"))
    catch
        return 1
}

ReadOut(f) {
    try
        return Trim(FileRead(f, "CP0"), " `t`r`n")
    catch
        return ""
}

TailLines(text, n := 12) {
    lines := StrSplit(text, "`n", "`r")
    out := ""
    start := Max(1, lines.Length - n + 1)
    Loop lines.Length - start + 1
        out .= lines[start + A_Index - 1] "`n"
    return out
}

; 각 테이블의 행 개수를 "테이블" → 개수 Map으로 돌려준다.
CountTables(c, pw, tag) {
    sqlFile := TMP "\count.sql"
    outFile := TMP "\count_" tag ".txt"
    try FileDelete(sqlFile)
    FileAppend("
    (
SELECT table_name || '|' || (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text
FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;
    )", sqlFile, "UTF-8-RAW")
    code := RunCmd(BinPath("psql"), ConnArgs(c) ' -At -f "' sqlFile '"', pw, outFile)
    out := ReadOut(outFile)
    if code != 0
        throw Error("테이블 목록/행 개수를 읽지 못했습니다 (" tag ").`n" TailLines(out))
    m := Map()
    for line in StrSplit(out, "`n", "`r") {
        if InStr(line, "|") {
            p := StrSplit(line, "|")
            m[p[1]] := Integer(p[2])
        }
    }
    return m
}

CleanDump(inFile, outFile) {
    out := FileOpen(outFile, "w", "UTF-8-RAW")
    removed := 0
    Loop Read inFile {
        line := A_LoopReadLine
        if (line = "CREATE SCHEMA public;"
            || RegExMatch(line, "^ALTER SCHEMA public OWNER TO")
            || RegExMatch(line, "^COMMENT ON SCHEMA public")
            || RegExMatch(line, "^SET transaction_timeout")) {
            removed += 1
            continue
        }
        out.WriteLine(line)
    }
    out.Close()
    return removed
}

; ───────────────────────── 동작 ─────────────────────────

TestConnections() {
    src := ReadConn(srcUri, "원본")
    dst := ReadConn(dstUri, "새 DB")
    if (src["host"] = dst["host"] && src["user"] = dst["user"])
        throw Error("원본과 새 DB가 같은 곳입니다. 접속 문자열을 다시 확인하세요.")
    for each in [["원본", src, srcPw.Value, "src"], ["새 DB", dst, dstPw.Value, "dst"]] {
        name := each[1], c := each[2], pw := each[3], tag := each[4]
        Log(name " 연결 중… (" c["host"] ")")
        out := TMP "\test_" tag ".txt"
        testSql := TMP "\test.sql"
        try FileDelete(testSql)
        FileAppend("select current_database() || ' / PostgreSQL ' || current_setting('server_version');", testSql, "UTF-8-RAW")
        code := RunCmd(BinPath("psql"), ConnArgs(c) ' -At -f "' testSql '"', pw, out)
        if code != 0
            throw Error(name " 연결 실패:`n" TailLines(ReadOut(out)))
        info := ReadOut(out)
        counts := CountTables(c, pw, tag)
        total := 0
        for k, v in counts
            total += v
        Log(name " 연결 OK: " info " · public 테이블 " counts.Count "개 · 총 " total "행")
    }
    Log("두 곳 모두 연결 성공.")
}

StartCopy() {
    started := A_TickCount
    src := ReadConn(srcUri, "원본")
    dst := ReadConn(dstUri, "새 DB")
    if (src["host"] = dst["host"] && src["user"] = dst["user"])
        throw Error("원본과 새 DB가 같은 곳입니다. 접속 문자열을 다시 확인하세요. (원본이 지워지는 사고 방지)")
    if (srcPw.Value = "" || dstPw.Value = "")
        throw Error("원본/새 DB 비밀번호를 모두 입력해 주세요.")
    BinPath("pg_dump")
    BinPath("psql")

    msg := "원본: " src["user"] " @ " src["host"] "`n새 DB: " dst["user"] " @ " dst["host"] "`n`n"
    if wipeCb.Value
        msg .= "새 DB의 public 테이블을 모두 삭제한 뒤 원본 데이터로 채웁니다.`n새 DB가 맞는지 다시 확인하세요."
    else
        msg .= "새 DB의 기존 테이블은 지우지 않고 복사합니다(이미 같은 이름의 테이블이 있으면 실패)."
    if MsgBox(msg "`n`n시작할까요?", "복사 확인", "YesNo Icon?") != "Yes"
        return

    dumpFile := TMP "\dump.sql"
    cleanFile := TMP "\restore.sql"
    try {
        Log("[1/6] 원본 연결/행 개수 확인")
        srcCounts := CountTables(src, srcPw.Value, "src")
        total := 0
        for k, v in srcCounts
            total += v
        Log("원본 public 테이블 " srcCounts.Count "개, 총 " total "행")
        if srcCounts.Count = 0
            throw Error("원본 public 스키마에 테이블이 없습니다. 접속 정보를 확인하세요.")

        Log("[2/6] 원본 덤프 중… (데이터가 많으면 시간이 걸립니다)")
        out := TMP "\dump_out.txt"
        code := RunCmd(BinPath("pg_dump"), ConnArgs(src) ' --schema=public --no-owner --no-privileges -f "' dumpFile '"', srcPw.Value, out)
        if code != 0
            throw Error("pg_dump 실패:`n" TailLines(ReadOut(out)))
        Log("덤프 완료 (" Round(FileGetSize(dumpFile) / 1024) " KB)")

        Log("[3/6] 덤프 정리")
        removed := CleanDump(dumpFile, cleanFile)
        Log("충돌하는 " removed "줄 제거")

        if wipeCb.Value {
            Log("[4/6] 새 DB의 기존 public 객체 삭제")
            wipeSql := TMP "\wipe.sql"
            try FileDelete(wipeSql)
            FileAppend("
            (
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.tablename);
  END LOOP;
  FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e') LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', r.sig);
  END LOOP;
  FOR r IN SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public' LOOP
    EXECUTE format('DROP SEQUENCE IF EXISTS public.%I CASCADE', r.sequence_name);
  END LOOP;
  FOR r IN SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
           WHERE n.nspname = 'public' AND t.typtype IN ('e', 'd') LOOP
    EXECUTE format('DROP TYPE IF EXISTS public.%I CASCADE', r.typname);
  END LOOP;
END $$;
            )", wipeSql, "UTF-8-RAW")
            out := TMP "\wipe_out.txt"
            code := RunCmd(BinPath("psql"), ConnArgs(dst) ' -q -v ON_ERROR_STOP=1 -f "' wipeSql '"', dstPw.Value, out)
            if code != 0
                throw Error("새 DB 정리 실패:`n" TailLines(ReadOut(out)))
        } else {
            Log("[4/6] 새 DB 정리 건너뜀")
        }

        Log("[5/6] 새 DB로 복원 중… (한 번에 전부 적용, 오류가 나면 전부 취소됩니다)")
        out := TMP "\restore_out.txt"
        code := RunCmd(BinPath("psql"), ConnArgs(dst) ' -q -1 -v ON_ERROR_STOP=1 -f "' cleanFile '"', dstPw.Value, out)
        if code != 0
            throw Error("복원 실패 (새 DB에는 아무것도 반영되지 않았습니다):`n" TailLines(ReadOut(out)))
        Log("복원 완료")

        Log("[6/6] 권한 부여, API 스키마 새로고침, 개수 비교")
        postSql := TMP "\post.sql"
        try FileDelete(postSql)
        FileAppend("
        (
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
        )", postSql, "UTF-8-RAW")
        out := TMP "\post_out.txt"
        code := RunCmd(BinPath("psql"), ConnArgs(dst) ' -q -v ON_ERROR_STOP=1 -f "' postSql '"', dstPw.Value, out)
        if code != 0
            Log("권한/새로고침 경고: " TailLines(ReadOut(out), 4))

        dstCounts := CountTables(dst, dstPw.Value, "dst")
        bad := 0
        dstTotal := 0
        for name, n in srcCounts {
            d := dstCounts.Has(name) ? dstCounts[name] : -1
            dstTotal += Max(d, 0)
            if d != n {
                bad += 1
                Log("불일치: " name "  원본 " n " / 새 DB " (d < 0 ? "테이블 없음" : d))
            }
        }
        sec := Round((A_TickCount - started) / 1000)
        if bad = 0 {
            Log("완료: 테이블 " srcCounts.Count "개 · 총 " dstTotal "행이 모두 일치합니다. (" sec "초)")
            Log("다음: 새 사이트(Vercel)의 환경변수를 새 Supabase 값으로 설정하고 재배포하세요.")
            msgDone := "복사가 끝났고 모든 테이블의 행 개수가 일치합니다.`n`n테이블 " srcCounts.Count "개 · 총 " dstTotal "행 (" sec "초)"
            site := Trim(siteEdit.Value)
            if (site != "" && MsgBox(msgDone "`n`n새 홈페이지를 열까요?`n" site, "복사 완료", "YesNo Iconi") = "Yes") {
                if !RegExMatch(site, "i)^https?://")
                    site := "https://" site
                Run site
            } else if site = "" {
                MsgBox(msgDone, "복사 완료", "Iconi")
            }
        } else {
            Log("주의: " bad "개 테이블이 원본과 다릅니다. 위 로그를 확인하세요.")
            MsgBox("복사는 끝났지만 " bad "개 테이블의 행 개수가 원본과 다릅니다.`n로그를 확인하세요.", "확인 필요", "Icon!")
        }
    } finally {
        ; 덤프 파일에는 모든 사용자 데이터가 들어있으므로 끝나면(성공/실패 모두) 바로 지운다.
        for f in [dumpFile, cleanFile]
            try FileDelete(f)
    }
}
