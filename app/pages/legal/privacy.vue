<template>
  <div class="font-landing mx-auto max-w-3xl px-6 py-14">
    <div class="text-xs font-bold tracking-[0.3em] text-slate-500">PRIVACY</div>
    <h1 class="mt-4 text-3xl font-black text-white">{{ t('개인정보처리방침', 'Privacy Policy') }}</h1>
    <p class="mt-2 text-sm text-slate-500">{{ t('최종 업데이트', 'Last updated') }}: {{ t(updatedAt, updatedAtEn) }}</p>

    <div class="mt-10 space-y-8 border-t border-white/10 pt-10">
      <section v-for="(item, idx) in sections" :key="idx">
        <h2 class="text-base font-bold text-white">{{ t(item.title, item.titleEn) }}</h2>
        <p class="mt-2 text-sm leading-7 text-slate-400"><BrandText :text="t(item.body, item.bodyEn)" /></p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useLocale()
const config = useRuntimeConfig()
const appName = config.public.appName
const updatedAt = '2026년 8월 1일'
const updatedAtEn = 'August 1, 2026'

const sections = [
  {
    title: '1. 수집하는 정보',
    titleEn: '1. Information We Collect',
    body: '회원가입 및 이용 과정에서 이메일, 닉네임, 비밀번호 해시, 전화번호 인증 정보, 회원 유형을 수집합니다. 원화입금회원에 한해 예금주명, 은행명, 암호화된 계좌번호를 추가로 수집합니다. 접속 IP, 기기 정보, 주문 및 거래 기록, 입출금 기록, 고객지원 문의 내용을 수집할 수 있습니다.',
    bodyEn: 'During registration and use, we collect your email, nickname, password hash, phone verification info, and member type. For KRW-deposit members, we additionally collect the account holder name, bank name, and an encrypted account number. We may also collect access IP, device info, order and trade records, deposit/withdrawal records, and support inquiries.'
  },
  {
    title: '2. 이용 목적',
    titleEn: '2. Purpose of Use',
    body: '수집한 정보는 계정 생성, 로그인, 보안 인증, 거래 처리, 지갑 잔액 관리, 고객지원, 부정 이용 방지, 법령 준수, 서비스 품질 개선에 사용됩니다.',
    bodyEn: 'Collected information is used for account creation, login, security authentication, trade processing, wallet balance management, customer support, fraud prevention, legal compliance, and service quality improvement.'
  },
  {
    title: '3. 보관 기간',
    titleEn: '3. Retention Period',
    body: '계정 정보는 회원 탈퇴 또는 서비스 종료 시까지 보관합니다. 거래, 입출금, 보안 로그 등 법령 준수와 분쟁 대응에 필요한 기록은 관련 기준에 따라 일정 기간 보관될 수 있습니다.',
    bodyEn: 'Account information is retained until account closure or service termination. Records needed for legal compliance and dispute resolution, such as trade, deposit/withdrawal, and security logs, may be retained for a set period per applicable standards.'
  },
  {
    title: '4. 보호 조치',
    titleEn: '4. Protective Measures',
    body: `${appName}는 비밀번호 단방향 해시, 접근 권한 제한, 인증 토큰 검증, 관리자 활동 로그, 비정상 요청 제한 등 기술적·관리적 보호 조치를 적용합니다. 원화 계좌번호는 별도 암호화 키로 암호화해 저장합니다.`,
    bodyEn: `${appName} applies technical and administrative safeguards including one-way password hashing, access restriction, auth token verification, admin activity logs, and abnormal request throttling. KRW account numbers are stored encrypted with a separate encryption key.`
  },
  {
    title: '5. 제3자 제공',
    titleEn: '5. Third-Party Disclosure',
    body: '법령상 의무, 이용자 동의, 결제·입출금·본인확인·고객지원 처리에 필요한 경우를 제외하고 개인정보를 임의로 제3자에게 제공하지 않습니다.',
    bodyEn: 'We do not arbitrarily disclose personal information to third parties, except where required by law, with user consent, or as necessary for payment, deposit/withdrawal, identity verification, or support processing.'
  },
  {
    title: '6. 이용자 권리',
    titleEn: '6. User Rights',
    body: '이용자는 개인정보 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다. 단, 거래 안전과 법령 준수를 위해 일부 기록은 즉시 삭제되지 않을 수 있습니다.',
    bodyEn: 'Users may request to view, correct, delete, or suspend processing of their personal information. However, for transaction safety and legal compliance, some records may not be deleted immediately.'
  },
  {
    title: '7. 문의',
    titleEn: '7. Contact',
    body: '개인정보 관련 요청은 고객지원으로 접수해 주세요.',
    bodyEn: 'Please submit privacy-related requests through Support.'
  }
]
</script>
