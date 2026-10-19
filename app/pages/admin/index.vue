<template>
  <div class="space-y-6">
    <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-semibold">{{ t('관리자 대시보드', 'Admin Dashboard') }}</h1>
          <p class="mt-1 text-sm text-slate-400">{{ me?.username }} ({{ me?.role }})</p>
        </div>
        <NuxtLink
          v-if="me?.role === 'super_admin'"
          to="/admin/create-branch"
          class="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          {{ t('계정생성', 'Create Account') }}
        </NuxtLink>
      </div>
    </div>

    <!-- 탭 -->
    <div class="flex flex-wrap gap-1 border-b border-white/10">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="border-b-2 px-4 py-2 text-sm font-medium transition"
        :class="activeTab === tab.key ? 'border-indigo-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 유저 관리 -->
    <div v-show="activeTab === 'users'" class="space-y-3">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">{{ t('유저 관리', 'User Management') }}</h2>
          <p class="mt-1 text-sm text-slate-400">{{ t('아이디/이름/USDT잔액/추천코드/역할/정산유형/정산비율을 수정하면 바로 반영됩니다.', 'Changes to username/name/USDT balance/referral code/role/settlement type/settlement rate apply immediately.') }}</p>
        </div>
        <div class="flex items-center gap-2">
          <div class="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100">
            {{ t('총 유저수', 'Total users') }} <span class="font-data text-base font-semibold">{{ sortedUsers.length }}</span>{{ t('명', '') }}
          </div>
          <button class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15" @click="load">
            {{ t('새로고침', 'Refresh') }}
          </button>
        </div>
      </div>

      <div class="grid gap-2 md:grid-cols-[360px_minmax(220px,1fr)_160px]">
        <div class="flex items-center gap-2 rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200">
          <input v-model="fromDate" type="date" class="date-input w-full bg-transparent outline-none" />
          <span class="text-slate-500">~</span>
          <input v-model="toDate" type="date" class="date-input w-full bg-transparent outline-none" />
        </div>
        <input
          v-model.trim="userSearch"
          :placeholder="t('아이디/이름 검색', 'Search by username/name')"
          :key="`user-search-${locale}`"
          class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-indigo-400/60"
        />
        <div class="flex items-center gap-2 rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200">
          <span class="whitespace-nowrap text-slate-400">{{ t('표시수', 'Rows shown') }}</span>
          <input
            v-model.number="pageSizeInput"
            type="number"
            min="1"
            max="500"
            class="w-full bg-transparent text-right outline-none"
          />
        </div>
      </div>

      <div v-if="referralFilter" class="flex items-center gap-2 text-sm text-slate-300">
        <span class="rounded-md bg-indigo-500/15 px-3 py-1.5 text-indigo-200 ring-1 ring-indigo-400/30">
          {{ t(`하부보기: "${referralFilter}"의 전체 하부 조직`, `Downline view: entire downline organization of "${referralFilter}"`) }}
        </span>
        <button class="rounded-md bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15" @click="referralFilter = null">
          {{ t('필터 해제', 'Clear Filter') }}
        </button>
      </div>

      <div>
        <div v-if="loading" class="text-sm text-slate-400">{{ t('불러오는 중…', 'Loading…') }}</div>
        <div v-else>
          <table class="w-full text-sm">
            <thead class="border-b border-[#12314a] text-[12px] text-slate-500">
              <tr>
                <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('username')">{{ t('아이디', 'Username') }}<span class="sort-icon">{{ sortArrow('username') || ' ⇅' }}</span></th>
                <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('name')">{{ t('이름', 'Name') }}<span class="sort-icon">{{ sortArrow('name') || ' ⇅' }}</span></th>
                <th class="whitespace-nowrap px-3 py-3 text-left">{{ t('계좌정보', 'Bank Account') }}</th>
                <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('usdt')">{{ t('USDT잔액', 'USDT Balance') }}<span class="sort-icon">{{ sortArrow('usdt') || ' ⇅' }}</span></th>
                <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('referralCode')">{{ t('추천코드', 'Referral Code') }}<span class="sort-icon">{{ sortArrow('referralCode') || ' ⇅' }}</span></th>
                <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('role')">{{ t('역할', 'Role') }}<span class="sort-icon">{{ sortArrow('role') || ' ⇅' }}</span></th>
                <th class="whitespace-nowrap px-3 py-3 text-left">{{ t('정산유형', 'Settlement Type') }}</th>
                <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('created_at')">{{ t('가입일', 'Joined') }}<span class="sort-icon">{{ sortArrow('created_at') || ' ⇅' }}</span></th>
                <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('last_login')">{{ t('최근 접속일', 'Last Login') }}<span class="sort-icon">{{ sortArrow('last_login') || ' ⇅' }}</span></th>
                <th class="whitespace-nowrap px-3 py-3 text-center">{{ t('하부보기', 'Downline') }}</th>
                <th class="whitespace-nowrap px-3 py-3 text-center">{{ t('비밀번호', 'Password') }}</th>
                <th class="whitespace-nowrap px-3 py-3 text-center">{{ t('로그인', 'Login') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in pagedUsers" :key="u.id" class="border-b border-[#0d2438] hover:bg-white/[0.02]">
                <template v-if="userDraft[u.id]">
                  <td class="px-3 py-2.5">
                    <input
                      v-model.trim="userDraft[u.id].username"
                      :disabled="isLockedUser(u)"
                      class="w-28 rounded-md border border-[#173753] bg-[#041425] px-2.5 py-1.5 text-sm text-slate-200 outline-none transition focus:border-indigo-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                      @blur="saveUserRow(u.id)"
                      @keyup.enter="saveUserRow(u.id)"
                    />
                  </td>
                  <td class="px-3 py-2.5">
                    <input
                      v-model.trim="userDraft[u.id].name"
                      :disabled="isLockedUser(u)"
                      class="w-24 rounded-md border border-[#173753] bg-[#041425] px-2.5 py-1.5 text-sm text-slate-200 outline-none transition focus:border-indigo-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                      @blur="saveUserRow(u.id)"
                      @keyup.enter="saveUserRow(u.id)"
                    />
                  </td>
                  <td class="px-3 py-2.5">
                    <button
                      class="whitespace-nowrap rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="isLockedUser(u)"
                      @click="openAccountModal(u)"
                    >
                      {{ t('계좌정보', 'Bank Account') }}
                    </button>
                  </td>
                  <td class="px-3 py-2.5">
                    <input
                      v-model.number="userDraft[u.id].usdt"
                      type="number"
                      min="0"
                      step="0.01"
                      class="w-28 rounded-md border border-[#173753] bg-[#041425] px-2.5 py-1.5 text-sm text-slate-200 outline-none transition focus:border-indigo-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                      @blur="saveUserRow(u.id)"
                      @keyup.enter="saveUserRow(u.id)"
                    />
                  </td>
                  <td class="px-3 py-2.5">
                    <input
                      v-model.trim="userDraft[u.id].referralCode"
                      :disabled="isLockedUser(u)"
                      class="w-28 rounded-md border border-[#173753] bg-[#041425] px-2.5 py-1.5 text-sm text-slate-200 outline-none transition focus:border-indigo-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                      @blur="saveUserRow(u.id)"
                      @keyup.enter="saveUserRow(u.id)"
                    />
                  </td>
                  <td class="px-3 py-2.5">
                    <select
                      v-model="userDraft[u.id].role"
                      :disabled="isLockedUser(u)"
                      class="w-40 rounded-md border border-[#173753] bg-[#041425] px-2.5 py-1.5 text-sm text-slate-200 outline-none transition focus:border-indigo-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                      @change="saveUserRow(u.id)"
                    >
                      <option value="user">{{ t('회원', 'Member') }} (user)</option>
                      <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.label }} ({{ r.id }})</option>
                      <option value="super_admin">{{ t('최고관리자', 'Super Admin') }} (super_admin)</option>
                    </select>
                  </td>
                  <td class="px-3 py-2.5">
                    <div v-if="u.role !== 'user' && u.role !== 'super_admin'" class="flex items-center gap-1.5">
                      <select
                        v-model="userDraft[u.id].settlementType"
                        class="w-28 rounded-md border border-[#173753] bg-[#041425] px-2.5 py-1.5 text-sm text-slate-200 outline-none transition focus:border-indigo-400/60"
                        @change="saveUserRow(u.id)"
                      >
                        <option value="loss">{{ t('손실정산', 'Loss Settlement') }}</option>
                        <option value="referral">{{ t('레퍼럴정산', 'Referral Settlement') }}</option>
                      </select>
                      <input
                        v-model="userDraft[u.id].settlementPercent"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        :placeholder="t('기본값', 'Default')"
                        :title="t('이 부관리자 전용 정산비율(%). 비워두면 정산/기타 설정의 기본값을 사용합니다.', 'Settlement rate (%) specific to this sub-admin. Leave blank to use the default from Settlement/Other Settings.')"
                        :key="`settlement-percent-${u.id}-${locale}`"
                        class="w-16 rounded-md border border-[#173753] bg-[#041425] px-2 py-1.5 text-sm text-slate-200 outline-none transition focus:border-indigo-400/60"
                        @blur="saveUserRow(u.id)"
                        @keyup.enter="saveUserRow(u.id)"
                      />
                      <span class="text-xs text-slate-500">%</span>
                    </div>
                    <span v-else class="text-xs text-slate-600">—</span>
                  </td>
                  <td class="whitespace-nowrap px-3 py-2.5 font-data text-slate-300">{{ dateOnly(u.created_at) }}</td>
                  <td class="whitespace-nowrap px-3 py-2.5 font-data text-slate-300">{{ u.last_login ? dateOnly(u.last_login) : '—' }}</td>
                  <td class="px-3 py-2.5 text-center">
                    <button
                      class="whitespace-nowrap rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
                      @click="referralFilter = u.username"
                    >
                      {{ t('하부보기', 'Downline') }}
                    </button>
                  </td>
                  <td class="px-3 py-2.5 text-center">
                    <button
                      class="whitespace-nowrap rounded-md bg-amber-500/15 px-3 py-1.5 text-sm text-amber-200 ring-1 ring-amber-400/30 hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="userResetting === u.id || isLockedUser(u)"
                      @click="resetUserPassword(u.id)"
                    >
                      {{ t('초기화', 'Reset') }}
                    </button>
                  </td>
                  <td class="px-3 py-2.5 text-center">
                    <button
                      class="whitespace-nowrap rounded-md bg-emerald-500/15 px-3 py-1.5 text-sm text-emerald-200 ring-1 ring-emerald-400/30 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="loggingInAs === u.id"
                      @click="loginAsUser(u.id)"
                    >
                      {{ t('로그인', 'Login') }}
                    </button>
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-4 flex items-center justify-between gap-3">
          <div class="text-sm text-slate-400">{{ t(`페이지 ${page} / ${totalPages} · 총 ${sortedUsers.length}명`, `Page ${page} / ${totalPages} · ${sortedUsers.length} total`) }}</div>
          <div class="flex items-center justify-center gap-2" v-if="totalPages > 1">
            <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page <= 1" @click="page = 1">«</button>
            <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page <= 1" @click="page--">‹</button>
            <button
              v-for="p in userPageNumbers"
              :key="`user-page-${p}`"
              class="min-w-9 rounded px-3 py-1.5 text-center text-sm"
              :class="p === page ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'"
              @click="page = p"
            >
              {{ p }}
            </button>
            <span v-if="showUserPageTail" class="px-1 text-sm text-slate-500">~</span>
            <button
              v-if="showUserPageTail"
              class="min-w-9 rounded bg-white/5 px-3 py-1.5 text-center text-sm text-slate-300 hover:bg-white/10"
              @click="page = totalPages"
            >
              {{ totalPages }}
            </button>
            <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page >= totalPages" @click="page++">›</button>
            <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page >= totalPages" @click="page = totalPages">»</button>
          </div>
        </div>

        <p v-if="error" class="mt-3 text-sm text-red-300">{{ error }}</p>
        <p v-if="msg" class="mt-3 text-sm text-emerald-300">{{ msg }}</p>
      </div>
    </div>

    <!-- 계좌정보 팝업 -->
    <div
      v-if="accountModalOpen"
      class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4"
      @click.self="closeAccountModal"
    >
      <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-[#10171d] p-6 shadow-2xl">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-slate-100">{{ t(`${accountModalTarget?.username} 계좌정보`, `${accountModalTarget?.username} Bank Account`) }}</h3>
          <button type="button" class="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" @click="closeAccountModal">✕</button>
        </div>
        <div class="mt-4 space-y-3">
          <div>
            <label class="text-sm text-slate-300">{{ t('은행명', 'Bank Name') }}</label>
            <select v-model="accountDraft.bankName" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-white/10 focus:ring-indigo-500">
              <option v-for="bank in bankOptions" :key="bank.ko" :value="bank.ko">{{ t(bank.ko, bank.en) }}</option>
            </select>
          </div>
          <div>
            <label class="text-sm text-slate-300">{{ t('계좌번호', 'Account Number') }}</label>
            <input v-model.trim="accountDraft.bankAccount" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
          </div>
          <div>
            <label class="text-sm text-slate-300">{{ t('예금주', 'Account Holder') }}</label>
            <input v-model.trim="accountDraft.accountHolder" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
          </div>
        </div>
        <p v-if="accountModalError" class="mt-3 text-sm text-red-300">{{ accountModalError }}</p>
        <div class="mt-5 grid grid-cols-2 gap-3">
          <button class="rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10" @click="closeAccountModal">
            {{ t('취소', 'Cancel') }}
          </button>
          <button
            class="rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
            :disabled="accountModalSaving"
            @click="saveAccountModal"
          >
            {{ t('저장', 'Save') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 강제청산 기준(%) 설정 -->
    <div v-show="activeTab === 'liquidation'" class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 class="text-lg font-semibold">{{ t('강제청산 기준 설정', 'Liquidation Threshold Settings') }}</h2>
      <p class="mt-1 text-sm text-slate-400">
        {{ t('손실률(ROE)이 이 값 이하로 떨어지면 모든 유저의 포지션이 실시간으로 자동 강제청산됩니다.', 'When ROE drops to or below this value, all users\' positions are automatically force-liquidated in real time.') }}
      </p>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2">
          <input
            v-model.number="liquidationPercentDraft"
            type="number"
            min="1"
            max="99"
            step="1"
            class="w-24 rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
          <span class="text-sm text-slate-400">{{ t('% 손실 시 강제청산', '% loss triggers liquidation') }}</span>
        </div>
        <button
          class="rounded-md bg-indigo-500 px-4 py-2 text-sm hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="liquidationSettingSaving"
          @click="saveLiquidationSetting"
        >
          {{ t('저장', 'Save') }}
        </button>
        <span class="text-sm text-slate-400">{{ t(`현재 적용값: -${liquidationPercent}%`, `Current value: -${liquidationPercent}%`) }}</span>
      </div>
      <p v-if="liquidationSettingError" class="mt-3 text-sm text-red-300">{{ liquidationSettingError }}</p>
      <p v-if="liquidationSettingMsg" class="mt-3 text-sm text-emerald-300">{{ liquidationSettingMsg }}</p>
    </div>

    <!-- 정산/기타 설정 -->
    <div v-show="activeTab === 'misc'" class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 class="text-lg font-semibold">{{ t('정산/기타 설정', 'Settlement/Other Settings') }}</h2>
      <p class="mt-1 text-sm text-slate-400">{{ t('고객센터 텔레그램 링크, 원/USDT 환율, 정산 비율을 설정합니다.', 'Set the support Telegram link, KRW/USDT exchange rate, and settlement rates.') }}</p>
      <div class="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label class="text-sm text-slate-300">{{ t('고객센터 텔레그램 링크', 'Support Telegram Link') }}</label>
          <input
            v-model.trim="miscDraft.telegramUrl"
            placeholder="https://t.me/..."
            class="mt-1 w-full rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label class="text-sm text-slate-300">{{ t('원/USDT 환율 (0 = 매일 09시 자동 환율 사용)', 'KRW/USDT Rate (0 = use automatic 9 AM daily rate)') }}</label>
          <input
            v-model.number="miscDraft.krwPerUsdt"
            type="number"
            min="0"
            step="0.01"
            class="mt-1 w-full rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
          <p class="mt-1 text-xs text-slate-500">
            {{ t('현재 자동 환율(매일 오전 9시 빗썸 기준 고정):', 'Current automatic rate (fixed daily at 9 AM based on Bithumb):') }} <span class="font-data text-slate-300">{{ dailyKrwRate ? t(`${fmt0(dailyKrwRate)}원`, `₩${fmt0(dailyKrwRate)}`) : t('아직 없음', 'Not available yet') }}</span>
            <span v-if="dailyKrwRateDay"> {{ t(`(${dailyKrwRateDay} 갱신)`, `(updated ${dailyKrwRateDay})`) }}</span>
          </p>
        </div>
        <div>
          <label class="text-sm text-slate-300">{{ t('손실정산 기본 비율 (%)', 'Default Loss Settlement Rate (%)') }}</label>
          <input
            v-model.number="miscDraft.lossSettlementPercent"
            type="number"
            min="0"
            max="100"
            step="0.1"
            class="mt-1 w-full rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
          <p class="mt-1 text-xs text-slate-500">{{ t('부관리자별 개별 비율을 지정하지 않았을 때 사용되는 기본값입니다.', 'Default used when no individual rate is set for a sub-admin.') }}</p>
        </div>
        <div>
          <label class="text-sm text-slate-300">{{ t('레퍼럴정산 기본 비율 (%)', 'Default Referral Settlement Rate (%)') }}</label>
          <input
            v-model.number="miscDraft.referralSettlementPercent"
            type="number"
            min="0"
            max="100"
            step="0.1"
            class="mt-1 w-full rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
          <p class="mt-1 text-xs text-slate-500">{{ t('부관리자별 개별 비율을 지정하지 않았을 때 사용되는 기본값입니다.', 'Default used when no individual rate is set for a sub-admin.') }}</p>
        </div>
      </div>

      <div class="mt-6 border-t border-white/10 pt-5">
        <h3 class="text-sm font-semibold text-slate-200">{{ t('관리자 메뉴 순서', 'Admin Menu Order') }}</h3>
        <p class="mt-1 text-xs text-slate-400">{{ t('상단 관리자 메뉴가 보이는 순서를 바꿉니다. 화살표로 위/아래로 옮기세요.', 'Change the order the top admin menu items appear in. Use the arrows to move items up/down.') }}</p>
        <div class="mt-3 space-y-1.5">
          <div
            v-for="(key, idx) in miscDraft.menuOrder"
            :key="key"
            class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
          >
            <span class="text-sm text-slate-200">{{ menuMeta[key] ? t(menuMeta[key].labelKo, menuMeta[key].labelEn) : key }}</span>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30"
                :disabled="idx === 0"
                @click="moveMenuOrder(idx, -1)"
              >
                ▲
              </button>
              <button
                type="button"
                class="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30"
                :disabled="idx === miscDraft.menuOrder.length - 1"
                @click="moveMenuOrder(idx, 1)"
              >
                ▼
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 flex items-center gap-3">
        <button
          class="rounded-md bg-indigo-500 px-4 py-2 text-sm hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="miscSaving"
          @click="saveMiscSettings"
        >
          {{ t('저장', 'Save') }}
        </button>
        <p v-if="miscError" class="text-sm text-red-300">{{ miscError }}</p>
        <p v-if="miscMsg" class="text-sm text-emerald-300">{{ miscMsg }}</p>
      </div>
    </div>

    <!-- 메뉴구성 -->
    <div v-show="activeTab === 'nav'" class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 class="text-lg font-semibold">{{ t('메뉴구성', 'Menu Layout') }}</h2>
      <p class="mt-1 text-sm text-slate-400">
        {{ t('비회원을 포함해 누구나 보는 최상단 메인 메뉴의 순서를 바꾸거나, 특정 메뉴를 화면에서 숨길 수 있습니다.', 'Change the order of the top main menu that everyone sees, including non-members, or hide specific menu items from view.') }}
      </p>

      <div class="mt-4 space-y-2">
        <div
          v-for="(key, idx) in mainNavDraft.order"
          :key="key"
          class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3"
        >
          <div class="flex items-center gap-3">
            <div class="flex flex-col">
              <button
                type="button"
                class="rounded bg-white/10 px-1.5 text-[12px] leading-4 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30"
                :disabled="idx === 0"
                @click="moveMainNavOrder(idx, -1)"
              >
                ▲
              </button>
              <button
                type="button"
                class="rounded bg-white/10 px-1.5 text-[12px] leading-4 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30"
                :disabled="idx === mainNavDraft.order.length - 1"
                @click="moveMainNavOrder(idx, 1)"
              >
                ▼
              </button>
            </div>
            <span class="text-sm font-semibold text-slate-100" :class="{ 'text-slate-500 line-through': mainNavDraft.hidden.includes(key) }">
              {{ t(MAIN_NAV_LABELS[key].ko, MAIN_NAV_LABELS[key].en) }}
            </span>
          </div>
          <label class="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" :checked="!mainNavDraft.hidden.includes(key)" @change="toggleMainNavHidden(key)" />
            {{ t('화면에 표시', 'Show on screen') }}
          </label>
        </div>
      </div>

      <div class="mt-4 flex items-center gap-3">
        <button
          class="rounded-md bg-indigo-500 px-4 py-2 text-sm hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="mainNavSaving"
          @click="saveMainNavSettings"
        >
          {{ t('저장', 'Save') }}
        </button>
        <p v-if="mainNavError" class="text-sm text-red-300">{{ mainNavError }}</p>
        <p v-if="mainNavMsg" class="text-sm text-emerald-300">{{ mainNavMsg }}</p>
      </div>
    </div>

    <!-- 카드 디자인(수익카드) -->
    <div v-show="activeTab === 'profitCard'" class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 class="text-lg font-semibold">{{ t('카드 디자인', 'Card Design') }}</h2>
      <p class="mt-1 text-sm text-slate-400">
        {{ t('거래내역 "카드" 버튼을 누르면 뜨는 수익카드(청산카드) 디자인을 조정합니다. 아래 미리보기에서', 'Adjust the design of the profit card (liquidation card) that appears when clicking the "Card" button in trade history. In the preview below,') }}
        <span class="text-slate-200">{{ t('바꾸고 싶은 글자나 영역을 직접 클릭', 'click directly on the text or area you want to change') }}</span>{{ t('하면 오른쪽에 그 부분의 설정이 나타납니다.', ' and its settings will appear on the right.') }}
      </p>

      <div class="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
        <!-- 미리보기(클릭해서 편집) -->
        <div class="flex flex-wrap items-start justify-center gap-8 rounded-xl border border-white/10 bg-black/20 p-6">
          <div v-for="v in PROFIT_CARD_PREVIEW_VARIANTS" :key="v.key" class="flex flex-col items-center gap-3">
            <p class="text-sm text-slate-400">{{ t(v.titleKo, v.titleEn) }}</p>
            <div
              class="relative cursor-pointer shadow-[0_10px_32px_rgba(0,0,0,0.24)]"
              :style="{
                width: Math.min(300, profitCardDraft.cardWidth) + 'px',
                padding: profitCardDraft.cardPaddingY + 'px ' + profitCardDraft.cardPaddingX + 'px',
                borderRadius: profitCardDraft.cardRadius + 'px',
                borderWidth: profitCardDraft.borderWidth + 'px',
                borderStyle: 'solid',
                borderColor: profitCardDraft.borderColor,
                backgroundColor: profitCardDraft.bgColor,
                backgroundImage: `repeating-conic-gradient(${profitCardDraft.gridColor} 0% 25%, transparent 0% 50%)`,
                backgroundSize: profitCardDraft.gridSize + 'px ' + profitCardDraft.gridSize + 'px',
                fontFamily: profitCardDraft.fontFamily,
                outline: selectedTarget === 'card' ? '2px solid #818cf8' : 'none',
                outlineOffset: '2px'
              }"
              @click="selectTarget('card')"
            >
              <div class="flex flex-col items-center">
                <span
                  class="inline-flex cursor-pointer items-center gap-2 rounded"
                  :style="{ outline: selectedOffsetKey === 'logo' ? '2px solid #818cf8' : 'none', outlineOffset: '3px', ...cardOffsetStyle('logo') }"
                  @click.stop="selectTarget('logo', 'logo')"
                >
                  <img src="/brand-logo.png" alt="" class="max-w-none object-contain" :style="{ height: Math.max(8, Math.round(profitCardDraft.logoFontSize * 1.5) + cardSz('logo')) + 'px', width: 'auto' }" />
                </span>

                <div
                  class="-mb-2 mt-3 cursor-pointer rounded py-2"
                  :style="{ outline: selectedOffsetKey === 'divider' ? '2px solid #818cf8' : 'none', outlineOffset: '1px', ...cardOffsetStyle('divider') }"
                  @click.stop="selectTarget('divider', 'divider')"
                >
                  <div
                    class="h-[2px] w-9 rounded-full opacity-50"
                    :style="{ width: Math.max(4, 36 + cardSz('divider')) + 'px', backgroundColor: v.positive ? profitCardDraft.positiveColor : profitCardDraft.negativeColor }"
                  />
                </div>

                <div
                  class="mt-4 cursor-pointer rounded font-extrabold leading-none tracking-tight"
                  :style="{
                    fontSize: cardFs(profitCardDraft.roeFontSize, 'roe'),
                    color: v.positive ? profitCardDraft.positiveColor : profitCardDraft.negativeColor,
                    outline: selectedOffsetKey === 'roe' ? '2px solid #818cf8' : 'none',
                    outlineOffset: '3px',
                    ...cardOffsetStyle('roe')
                  }"
                  @click.stop="selectTarget('roe', 'roe')"
                >
                  {{ v.roeText }}
                </div>
                <div
                  class="mt-1.5 cursor-pointer rounded font-medium"
                  :style="{
                    fontSize: cardFs(profitCardDraft.wonFontSize, 'won'),
                    color: profitCardDraft.wonTextColor,
                    outline: selectedOffsetKey === 'won' ? '2px solid #818cf8' : 'none',
                    outlineOffset: '3px',
                    ...cardOffsetStyle('won')
                  }"
                  @click.stop="selectTarget('won', 'won')"
                >
                  {{ t(v.wonTextKo, v.wonTextEn) }}
                </div>

                <div class="mt-[18px] inline-flex items-center gap-2">
                  <span
                    class="cursor-pointer rounded-full px-2 py-0.5 font-bold"
                    :style="{
                      fontSize: cardFs(profitCardDraft.badgeFontSize, 'badge'),
                      backgroundColor: v.side === 'short' ? profitCardDraft.shortBadgeBg : profitCardDraft.longBadgeBg,
                      color: v.side === 'short' ? profitCardDraft.shortBadgeText : profitCardDraft.longBadgeText,
                      outline: selectedOffsetKey === 'badge' ? '2px solid #818cf8' : 'none',
                      outlineOffset: '2px',
                      ...cardOffsetStyle('badge')
                    }"
                    @click.stop="selectTarget('badge', 'badge')"
                  >
                    {{ v.side === 'short' ? t('숏', 'Short') : t('롱', 'Long') }}
                  </span>
                  <span
                    class="cursor-pointer rounded-full bg-white/[0.04] px-3.5 py-1.5 font-semibold"
                    :style="{
                      fontSize: cardFs(profitCardDraft.symbolFontSize, 'symbol'),
                      color: profitCardDraft.symbolTextColor,
                      outline: selectedOffsetKey === 'symbol' ? '2px solid #818cf8' : 'none',
                      outlineOffset: '2px',
                      ...cardOffsetStyle('symbol')
                    }"
                    @click.stop="selectTarget('symbol', 'symbol')"
                  >
                    {{ v.symbol }}
                  </span>
                </div>
              </div>

              <div
                class="mt-[26px] grid cursor-pointer grid-cols-2 gap-px overflow-hidden bg-white/[0.06]"
                :style="{
                  borderRadius: profitCardDraft.statBoxRadius + 'px',
                  outline: selectedOffsetKey === 'statBox' ? '2px solid #818cf8' : 'none',
                  outlineOffset: '2px',
                  ...cardBoxSizeStyle(),
                  ...cardOffsetStyle('statBox')
                }"
                @click.stop="selectTarget('statBox', 'statBox')"
              >
                <div
                  v-for="(box, bi) in [
                    { label: t('레버리지', 'Leverage'), value: t('격리 x', 'Isolated x') + v.leverage, positive: null },
                    { label: t('손익', 'P&L'), value: v.pnlText, positive: v.positive },
                    { label: t('진입가격', 'Entry Price'), value: v.entry, positive: null },
                    { label: t('종료가격', 'Exit Price'), value: v.exit, positive: null }
                  ]"
                  :key="box.label"
                  :style="{
                    backgroundColor: profitCardDraft.statBoxBg,
                    padding: profitCardDraft.statBoxPaddingY + 'px ' + profitCardDraft.statBoxPaddingX + 'px'
                  }"
                >
                  <div
                    class="cursor-pointer rounded"
                    :style="{
                      fontSize: cardFs(profitCardDraft.statLabelFontSize, STAT_BOX_KEYS[bi] + 'Label'),
                      color: profitCardDraft.statLabelColor,
                      outline: selectedOffsetKey === STAT_BOX_KEYS[bi] + 'Label' ? '2px solid #818cf8' : 'none',
                      outlineOffset: '2px',
                      ...cardOffsetStyle(STAT_BOX_KEYS[bi] + 'Label')
                    }"
                    @click.stop="selectTarget('statLabel', STAT_BOX_KEYS[bi] + 'Label')"
                  >
                    {{ box.label }}
                  </div>
                  <div
                    class="mt-1 cursor-pointer rounded font-bold"
                    :style="{
                      fontSize: cardFs(profitCardDraft.statValueFontSize, STAT_BOX_KEYS[bi] + 'Value'),
                      color: box.positive === null ? profitCardDraft.statValueColor : box.positive ? profitCardDraft.positiveColor : profitCardDraft.negativeColor,
                      outline: selectedOffsetKey === STAT_BOX_KEYS[bi] + 'Value' ? '2px solid #818cf8' : 'none',
                      outlineOffset: '2px',
                      ...cardOffsetStyle(STAT_BOX_KEYS[bi] + 'Value')
                    }"
                    @click.stop="selectTarget('statValue', STAT_BOX_KEYS[bi] + 'Value')"
                  >
                    {{ box.value }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 선택한 요소의 설정 패널 -->
        <div class="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-4 lg:sticky lg:top-4 lg:self-start">
          <div class="text-sm font-semibold text-indigo-300">{{ t(PROFIT_CARD_TARGET_LABELS[selectedTarget].ko, PROFIT_CARD_TARGET_LABELS[selectedTarget].en) }}</div>
          <p v-if="PROFIT_CARD_TARGET_HINTS[selectedTarget]" class="text-xs text-slate-500">{{ t(PROFIT_CARD_TARGET_HINTS[selectedTarget].ko, PROFIT_CARD_TARGET_HINTS[selectedTarget].en) }}</p>

          <div v-if="selectedOffsetKey" class="rounded-lg border border-indigo-400/30 bg-indigo-400/5 p-3 text-xs text-slate-300">
            <div class="font-semibold text-indigo-200">{{ t('위치 이동', 'Move Position') }}</div>
            <p class="mt-1 text-slate-400">
              {{ t('방향키(← ↑ → ↓)로 1px씩 이동, + / − 키로 크기를 1px씩 늘리고 줄입니다(글자는 글자 크기, 그림/선은 가로 길이). Shift를 같이 누르면 10px씩. 조정 후 아래 "저장"을 눌러야 고정됩니다. (Esc: 선택 해제)', 'Arrow keys (← ↑ → ↓) move 1px; + / − change the size by 1px (font size for text, width for pictures/lines). Hold Shift for 10px. Press "Save" below to lock it. (Esc: deselect)') }}
            </p>
            <div class="mt-2 font-mono text-slate-200">X {{ selectedOffset.x }}px · Y {{ selectedOffset.y }}px · {{ t('크기', 'Size') }} {{ selectedOffset.s > 0 ? '+' : '' }}{{ selectedOffset.s }}px</div>
            <div class="mt-2 flex items-center gap-2">
              <span class="text-slate-400">{{ t('크기', 'Size') }}</span>
              <button type="button" class="h-6 w-6 rounded bg-white/10 text-sm font-bold hover:bg-white/20" @click="changeSelectedSize(-1)">−</button>
              <button type="button" class="h-6 w-6 rounded bg-white/10 text-sm font-bold hover:bg-white/20" @click="changeSelectedSize(1)">+</button>
              <span class="text-slate-500">{{ t('(키보드 + / − 도 가능)', '(or the + / − keys)') }}</span>
            </div>
            <button type="button" class="mt-2 rounded bg-white/10 px-2 py-1 text-[11px] hover:bg-white/15" @click="resetSelectedOffset">
              {{ t('이 항목 위치 초기화', 'Reset this item position') }}
            </button>
          </div>

          <div v-if="selectedTarget === 'card'" class="flex flex-col gap-1">
            <label class="text-xs text-slate-400">{{ t('폰트', 'Font') }}</label>
            <select
              v-model="profitCardDraft.fontFamily"
              class="w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-cyan-400/40"
            >
              <option v-for="f in PROFIT_CARD_FONT_OPTIONS" :key="f.value" :value="f.value" :style="{ fontFamily: f.value }">{{ t(f.labelKo, f.labelEn) }}</option>
            </select>
          </div>

          <div v-for="f in currentNumberFields" :key="f.key" class="flex flex-col gap-1">
            <div class="flex items-center justify-between text-xs text-slate-400">
              <span>{{ t(f.labelKo, f.labelEn) }}</span>
              <span class="font-mono text-slate-300">{{ profitCardDraft[f.key] }}px</span>
            </div>
            <input v-model.number="profitCardDraft[f.key]" type="range" :min="f.min" :max="f.max" class="w-full accent-indigo-400" />
          </div>

          <label v-for="f in currentColorFields" :key="f.key" class="flex flex-col gap-1">
            <span class="text-xs text-slate-400">{{ t(f.labelKo, f.labelEn) }}</span>
            <span class="flex items-center gap-2">
              <input v-model="profitCardDraft[f.key]" type="color" class="h-8 w-10 cursor-pointer rounded border border-white/10 bg-transparent p-0" />
              <input
                v-model="profitCardDraft[f.key]"
                type="text"
                class="w-full rounded border border-white/10 bg-black/30 px-2 py-1 font-mono text-xs text-slate-200 outline-none focus:border-cyan-400/40"
              />
            </span>
          </label>
        </div>
      </div>

      <div class="mt-4 flex items-center gap-3">
        <button
          class="rounded-md bg-indigo-500 px-4 py-2 text-sm hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="profitCardSaving"
          @click="saveProfitCardStyle"
        >
          {{ t('저장', 'Save') }}
        </button>
        <button
          type="button"
          class="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
          @click="resetProfitCardStyle"
        >
          {{ t('기본값으로 초기화', 'Reset to Default') }}
        </button>
        <p v-if="profitCardError" class="text-sm text-red-300">{{ profitCardError }}</p>
        <p v-if="profitCardMsg" class="text-sm text-emerald-300">{{ profitCardMsg }}</p>
      </div>
    </div>

    <!-- 역할 관리 -->
    <div v-show="activeTab === 'roles'" class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div class="flex items-end justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">{{ t('역할 관리', 'Role Management') }}</h2>
          <p class="mt-1 text-sm text-slate-400">
            {{ t('관리자 역할을 추가/삭제하고, 역할마다 관리자 메뉴 권한을 설정합니다. 화살표는 화면에 보이는 순서만 바꾸고, 실제 권한 서열은 "등급" 숫자로 정해집니다(숫자가 작을수록 상위). 등급이 같은 역할끼리는 서로 역할을 부여할 수 없고, 자기보다 등급 숫자가 더 큰(아래) 역할만 코드부여할 수 있습니다. 여러 역할에 같은 등급을 입력하면 서로 동급으로 묶입니다. 총관리자는 항상 최상위입니다.', 'Add/remove admin roles and set admin menu permissions for each role. The arrows only change the on-screen display order — actual authority ranking is determined by the "tier" number (lower numbers rank higher). Roles with the same tier cannot grant roles to each other; you can only assign codes to roles with a higher (lower-ranked) tier number than your own. Entering the same tier for multiple roles groups them as equals. The super admin is always the highest rank.') }}
          </p>
        </div>
        <button class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15" @click="loadRoles">
          {{ t('새로고침', 'Refresh') }}
        </button>
      </div>

      <div class="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-white/10 bg-white/5 p-4">
        <div>
          <label class="text-xs text-slate-400">{{ t('역할 ID (영문 소문자, 예: team_lead)', 'Role ID (lowercase English, e.g. team_lead)') }}</label>
          <input
            v-model.trim="newRoleId"
            placeholder="team_lead"
            class="mt-1 w-40 rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label class="text-xs text-slate-400">{{ t('역할 이름', 'Role Name') }}</label>
          <input
            v-model.trim="newRoleLabel"
            :placeholder="t('팀장', 'Team Lead')"
            :key="`new-role-label-${locale}`"
            class="mt-1 w-32 rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
        </div>
        <button
          class="rounded-md bg-indigo-500 px-4 py-2 text-sm hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="creatingRole"
          @click="createRoleClick"
        >
          {{ t('역할 추가', 'Add Role') }}
        </button>
        <p v-if="newRoleError" class="w-full text-sm text-red-300">{{ newRoleError }}</p>
      </div>

      <div class="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
        <div v-if="rolesLoading" class="text-sm text-slate-400">{{ t('불러오는 중…', 'Loading…') }}</div>
        <div v-else-if="roles.length === 0" class="text-sm text-slate-400">{{ t('등록된 역할이 없습니다.', 'No roles registered.') }}</div>
        <div v-else class="space-y-2">
          <div v-for="(r, idx) in roles" :key="r.id" class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
            <div class="flex items-center gap-3">
              <span class="w-6 text-center font-data text-xs text-slate-500">{{ idx + 1 }}</span>
              <div class="flex flex-col">
                <button
                  type="button"
                  class="rounded bg-white/10 px-1.5 text-[12px] leading-4 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30"
                  :disabled="idx === 0 || reorderingRoles"
                  @click="moveRoleRank(idx, -1)"
                >
                  ▲
                </button>
                <button
                  type="button"
                  class="rounded bg-white/10 px-1.5 text-[12px] leading-4 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30"
                  :disabled="idx === roles.length - 1 || reorderingRoles"
                  @click="moveRoleRank(idx, 1)"
                >
                  ▼
                </button>
              </div>
              <div>
                <span class="text-sm font-semibold text-slate-100">{{ r.label }}</span>
                <span class="ml-2 font-data text-xs text-slate-500">{{ r.id }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div class="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
                <span class="text-xs text-slate-400">{{ t('등급', 'Tier') }}</span>
                <input
                  v-model="tierDraft[r.id]"
                  type="number"
                  step="1"
                  :disabled="savingTierId === r.id"
                  class="w-14 bg-transparent text-right text-sm text-slate-100 outline-none disabled:opacity-50"
                  @blur="saveRoleTier(r)"
                  @keyup.enter="saveRoleTier(r)"
                />
              </div>
              <button class="rounded-md bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15" @click="openRoleModal(r)">
                {{ t('메뉴 권한 설정', 'Menu Permissions') }}
              </button>
              <button
                class="rounded-md bg-rose-500/15 px-3 py-1.5 text-xs text-rose-200 ring-1 ring-rose-400/20 hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="deletingRoleId === r.id"
                @click="deleteRoleClick(r)"
              >
                {{ t('삭제', 'Delete') }}
              </button>
            </div>
          </div>
        </div>
        <p v-if="rolesError" class="mt-3 text-sm text-red-300">{{ rolesError }}</p>
      </div>
    </div>

    <!-- 킬UP/킬DOWN 이력 -->
    <div v-show="activeTab === 'killEvents'" class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold">{{ t('킬UP/킬DOWN 이력', 'Kill UP/DOWN History') }}</h2>
          <p class="mt-1 text-sm text-slate-400">
            {{ t('삭제하면 모든 유저의 차트에서도 해당 봉의 고가/저가(꼬리)가 사라집니다(잠시 후 자동 반영).', 'Deleting also removes that candle\'s high/low wick from every user\'s chart (applies automatically shortly after).') }}
          </p>
        </div>
        <button class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15" @click="loadKillEvents">
          {{ t('새로고침', 'Refresh') }}
        </button>
      </div>

      <div class="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
        <div v-if="killEventsLoading" class="text-sm text-slate-400">{{ t('불러오는 중…', 'Loading…') }}</div>
        <div v-else-if="killEvents.length === 0" class="text-sm text-slate-400">{{ t('킬 이력이 없습니다.', 'No kill history.') }}</div>
        <div v-else class="overflow-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-slate-400">
              <tr>
                <th class="py-2">{{ t('시각', 'Time') }}</th>
                <th class="py-2">{{ t('심볼', 'Symbol') }}</th>
                <th class="py-2">{{ t('방향', 'Direction') }}</th>
                <th class="py-2">{{ t('퍼센트', 'Percent') }}</th>
                <th class="py-2">{{ t('기준가 → 도달가', 'Base Price → Reached Price') }}</th>
                <th class="py-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="k in killEvents" :key="k.id" class="border-t border-white/10">
                <td class="py-2 font-data text-xs">{{ formatKillTime(k.createdAt) }}</td>
                <td class="py-2 font-data">{{ k.symbol }}</td>
                <td class="py-2" :class="k.direction === 'up' ? 'text-emerald-300' : 'text-rose-300'">
                  {{ k.direction === 'up' ? t('킬UP', 'Kill UP') : t('킬DOWN', 'Kill DOWN') }}
                </td>
                <td class="py-2 font-data">{{ k.percent }}%</td>
                <td class="py-2 font-data">{{ k.basePrice }} → {{ k.shockedPrice }}</td>
                <td class="py-2">
                  <button
                    class="rounded-md bg-rose-500/15 px-3 py-1 text-xs text-rose-200 ring-1 ring-rose-500/20 hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="killEventDeleting === k.id"
                    @click="deleteKillEvent(k.id)"
                  >
                    {{ t('삭제', 'Delete') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="killEventsError" class="mt-3 text-sm text-red-300">{{ killEventsError }}</p>
      </div>
    </div>

    <!-- 상승STOP/하락STOP 이력 -->
    <div v-show="activeTab === 'profitEvents'" class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold">{{ t('상승STOP/하락STOP 이력', 'Rise STOP/Fall STOP History') }}</h2>
          <p class="mt-1 text-sm text-slate-400">
            {{ t('삭제하면 모든 유저의 차트에서도 해당 봉의 고가/저가(꼬리)가 사라집니다(잠시 후 자동 반영).', 'Deleting also removes that candle\'s high/low wick from every user\'s chart (applies automatically shortly after).') }}
          </p>
        </div>
        <button class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15" @click="loadProfitEvents">
          {{ t('새로고침', 'Refresh') }}
        </button>
      </div>

      <div class="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
        <div v-if="profitEventsLoading" class="text-sm text-slate-400">{{ t('불러오는 중…', 'Loading…') }}</div>
        <div v-else-if="profitEvents.length === 0" class="text-sm text-slate-400">{{ t('상승STOP/하락STOP 이력이 없습니다.', 'No Rise STOP/Fall STOP history.') }}</div>
        <div v-else class="overflow-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-slate-400">
              <tr>
                <th class="py-2">{{ t('시각', 'Time') }}</th>
                <th class="py-2">{{ t('심볼', 'Symbol') }}</th>
                <th class="py-2">{{ t('방향', 'Direction') }}</th>
                <th class="py-2">{{ t('퍼센트(레버리지100x 기준)', 'Percent (based on 100x leverage)') }}</th>
                <th class="py-2">{{ t('기준가 → 도달가', 'Base Price → Reached Price') }}</th>
                <th class="py-2">{{ t('유지시간', 'Hold Time') }}</th>
                <th class="py-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in profitEvents" :key="p.id" class="border-t border-white/10">
                <td class="py-2 font-data text-xs">{{ formatKillTime(p.createdAt) }}</td>
                <td class="py-2 font-data">{{ p.symbol }}</td>
                <td class="py-2" :class="p.direction === 'up' ? 'text-emerald-300' : 'text-rose-300'">
                  {{ p.direction === 'up' ? t('수익', 'Profit') : t('손실', 'Loss') }}
                </td>
                <td class="py-2 font-data">{{ p.percent }}%</td>
                <td class="py-2 font-data">{{ p.basePrice }} → {{ p.shockedPrice }}</td>
                <td class="py-2 font-data">{{ t(`${(p.holdMs / 1000).toFixed(1)}초`, `${(p.holdMs / 1000).toFixed(1)}s`) }}</td>
                <td class="py-2">
                  <button
                    class="rounded-md bg-rose-500/15 px-3 py-1 text-xs text-rose-200 ring-1 ring-rose-500/20 hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="profitEventDeleting === p.id"
                    @click="deleteProfitEvent(p.id)"
                  >
                    {{ t('삭제', 'Delete') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="profitEventsError" class="mt-3 text-sm text-red-300">{{ profitEventsError }}</p>
      </div>
    </div>

    <!-- DB 연결 상태 -->
    <div v-show="activeTab === 'dbHealth'" class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold">{{ t('DB 연결 상태', 'DB Connection Status') }}</h2>
          <p class="mt-1 text-sm text-slate-400">
            {{ t('지금 배포된 버전 표시', 'The currently deployed version marker') }}(<span class="font-data">{{ dbHealth?.marker || '…' }}</span>){{ t('를 SQLite/Supabase 양쪽에 직접 써보고 바로 다시 읽어서, 실제로 그 DB에 반영되는지 확인합니다. 실제 서비스 데이터와는 무관한 테스트입니다.', ' is written directly to both SQLite and Supabase, then read back immediately to verify it actually persists to that DB. This test is unrelated to real service data.') }}
          </p>
        </div>
        <button
          class="rounded-md bg-indigo-500 px-3 py-2 text-sm hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="dbHealthLoading"
          @click="runDbHealthCheck"
        >
          {{ dbHealthLoading ? t('확인 중…', 'Checking…') : t('다시 확인', 'Recheck') }}
        </button>
      </div>

      <div v-if="dbHealth" class="mt-4 grid gap-4 sm:grid-cols-2">
        <div
          class="rounded-xl border p-4"
          :class="dbHealth.sqlite.ok ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'"
        >
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-slate-100">
              SQLite
              <span v-if="dbHealth.activeMode === 'sqlite'" class="ml-1 rounded-full bg-indigo-500/20 px-2 py-0.5 text-[11px] text-indigo-200">{{ t('현재 사용중', 'Currently in use') }}</span>
            </h3>
            <span :class="dbHealth.sqlite.ok ? 'text-emerald-300' : 'text-rose-300'">{{ dbHealth.sqlite.ok ? t('✓ 정상 연결됨', '✓ Connected') : t('✗ 실패', '✗ Failed') }}</span>
          </div>
          <div class="mt-2 space-y-1 text-xs text-slate-400">
            <div>{{ t('저장된 값:', 'Stored value:') }} <span class="font-data text-slate-200">{{ dbHealth.sqlite.marker ?? '—' }}</span></div>
            <div>{{ t('확인 시각:', 'Checked at:') }} <span class="font-data text-slate-200">{{ dbHealth.sqlite.checkedAt ? formatKillTime(dbHealth.sqlite.checkedAt) : '—' }}</span></div>
            <div class="truncate">{{ t('경로:', 'Path:') }} <span class="font-data text-slate-300">{{ dbHealth.sqlite.detail || '—' }}</span></div>
            <div v-if="dbHealth.sqlite.error" class="text-rose-300">{{ t('에러:', 'Error:') }} {{ dbHealth.sqlite.error }}</div>
          </div>
        </div>

        <div
          class="rounded-xl border p-4"
          :class="dbHealth.supabase.ok ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'"
        >
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-slate-100">
              Supabase
              <span v-if="dbHealth.activeMode === 'supabase'" class="ml-1 rounded-full bg-indigo-500/20 px-2 py-0.5 text-[11px] text-indigo-200">{{ t('현재 사용중', 'Currently in use') }}</span>
            </h3>
            <span :class="dbHealth.supabase.ok ? 'text-emerald-300' : 'text-rose-300'">{{ dbHealth.supabase.ok ? t('✓ 정상 연결됨', '✓ Connected') : t('✗ 실패', '✗ Failed') }}</span>
          </div>
          <div class="mt-2 space-y-1 text-xs text-slate-400">
            <div>{{ t('저장된 값:', 'Stored value:') }} <span class="font-data text-slate-200">{{ dbHealth.supabase.marker ?? '—' }}</span></div>
            <div>{{ t('확인 시각:', 'Checked at:') }} <span class="font-data text-slate-200">{{ dbHealth.supabase.checkedAt ? formatKillTime(dbHealth.supabase.checkedAt) : '—' }}</span></div>
            <div class="truncate">{{ t('프로젝트 이름:', 'Project Name:') }} <span class="font-data text-slate-300">{{ dbHealth.supabase.projectName || '—' }}</span></div>
            <div class="truncate">{{ t('프로젝트 URL:', 'Project URL:') }} <span class="font-data text-slate-300">{{ dbHealth.supabase.detail || '—' }}</span></div>
            <div v-if="dbHealth.supabase.error" class="text-rose-300">{{ t('에러:', 'Error:') }} {{ dbHealth.supabase.error }}</div>
          </div>
        </div>
      </div>
      <p v-else-if="dbHealthLoading" class="mt-4 text-sm text-slate-400">{{ t('확인 중…', 'Checking…') }}</p>
      <p v-if="dbHealthError" class="mt-3 text-sm text-red-300">{{ dbHealthError }}</p>
    </div>

    <!-- 역할 메뉴 권한 설정 팝업 -->
    <div
      v-if="roleModalOpen"
      class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4"
      @click.self="closeRoleModal"
    >
      <div class="w-full max-w-md rounded-2xl border border-white/10 bg-[#10171d] p-6 shadow-2xl">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-slate-100">{{ t(`${roleModalTarget?.label} 메뉴 권한`, `${roleModalTarget?.label} Menu Permissions`) }}</h3>
          <button type="button" class="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" @click="closeRoleModal">✕</button>
        </div>
        <div class="mt-3">
          <label class="text-xs text-slate-400">{{ t('역할 이름', 'Role Name') }}</label>
          <input
            v-model.trim="roleLabelDraft"
            class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
        </div>
        <div class="mt-4 space-y-3">
          <div v-for="key in menuKeys" :key="key" class="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <div class="flex items-center justify-between">
              <span class="text-sm text-slate-200">{{ t(menuMeta[key].labelKo, menuMeta[key].labelEn) }}</span>
              <label class="flex items-center gap-1.5 text-xs text-slate-300">
                <input v-model="roleMenuDraft[key].view" type="checkbox" class="h-4 w-4 accent-indigo-500" />
                {{ t('보임', 'Visible') }}
              </label>
            </div>
            <label v-if="menuMeta[key].editable" class="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
              <input v-model="roleMenuDraft[key].edit" type="checkbox" class="h-4 w-4 accent-indigo-500" :disabled="!roleMenuDraft[key].view" />
              {{ t(`${menuMeta[key].editLabelKo} 허용`, `Allow ${menuMeta[key].editLabelEn}`) }}
            </label>
          </div>
        </div>
        <p v-if="roleModalError" class="mt-3 text-sm text-red-300">{{ roleModalError }}</p>
        <div class="mt-5 grid grid-cols-2 gap-3">
          <button class="rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10" @click="closeRoleModal">
            {{ t('취소', 'Cancel') }}
          </button>
          <button
            class="rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
            :disabled="roleModalSaving"
            @click="saveRoleModal"
          >
            {{ t('저장', 'Save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['admin', 'super-admin'] })
const { t, locale } = useLocale()
const { me, refresh } = useMe()
await refresh()

type TabKey = 'users' | 'liquidation' | 'misc' | 'nav' | 'profitCard' | 'roles' | 'killEvents' | 'profitEvents' | 'dbHealth'
const tabs = computed<Array<{ key: TabKey; label: string }>>(() => [
  { key: 'users', label: t('유저 관리', 'User Management') },
  { key: 'liquidation', label: t('강제청산 기준 설정', 'Liquidation Threshold') },
  { key: 'misc', label: t('정산/기타 설정', 'Settlement/Other Settings') },
  { key: 'nav', label: t('메뉴구성', 'Menu Layout') },
  { key: 'profitCard', label: t('카드 디자인', 'Card Design') },
  { key: 'roles', label: t('역할 관리', 'Role Management') },
  { key: 'killEvents', label: t('킬UP/킬DOWN 이력', 'Kill UP/DOWN History') },
  { key: 'profitEvents', label: t('상승STOP/하락STOP 이력', 'Rise STOP/Fall STOP History') },
  { key: 'dbHealth', label: t('DB 연결 상태', 'DB Connection Status') }
])
const activeTab = ref<TabKey>('users')

type AdminUserRow = {
  id: number
  username: string
  name: string
  referralCode: string
  bankName: string
  bankAccount: string
  accountHolder: string
  role: string
  usdt: number
  created_at: string
  online: boolean
  last_login: string | null
  settlementType: 'loss' | 'referral'
  settlementPercent: number | null
}
type UserDraft = {
  username: string
  name: string
  usdt: number
  referralCode: string
  role: string
  settlementType: 'loss' | 'referral'
  settlementPercent: string
}

const users = ref<AdminUserRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const msg = ref<string | null>(null)
const userDraft = reactive<Record<number, UserDraft>>({})
const userSaving = ref<number | null>(null)
const userResetting = ref<number | null>(null)
const loggingInAs = ref<number | null>(null)
const userSearch = ref('')
const fromDate = ref('')
const toDate = ref('')
function dateOnly(v: string) {
  const s = String(v || '')
  return s ? s.slice(0, 10) : ''
}
const referralFilter = ref<string | null>(null)
const sortKey = ref<'username' | 'name' | 'usdt' | 'referralCode' | 'role' | 'created_at' | 'last_login'>('username')
const sortDir = ref<'asc' | 'desc'>('asc')
const page = ref(1)
const pageSizeInput = ref(20)
const pageSize = computed(() => {
  const n = Number(pageSizeInput.value || 20)
  return Math.max(1, Math.min(500, Number.isFinite(n) ? Math.floor(n) : 20))
})

const bankOptions = [
  { ko: '국민은행', en: 'KB Kookmin Bank' }, { ko: '신한은행', en: 'Shinhan Bank' }, { ko: '우리은행', en: 'Woori Bank' }, { ko: '하나은행', en: 'Hana Bank' },
  { ko: '농협은행', en: 'NH Nonghyup Bank' }, { ko: '기업은행', en: 'IBK Industrial Bank' }, { ko: '카카오뱅크', en: 'Kakao Bank' }, { ko: '토스뱅크', en: 'Toss Bank' },
  { ko: '케이뱅크', en: 'K Bank' }, { ko: '새마을금고', en: 'MG Community Credit Coop' }, { ko: '수협은행', en: 'Suhyup Bank' }, { ko: 'SC제일은행', en: 'SC First Bank' },
  { ko: '씨티은행', en: 'Citibank Korea' }, { ko: '부산은행', en: 'Busan Bank' }, { ko: '대구은행', en: 'Daegu Bank' }, { ko: '경남은행', en: 'Kyongnam Bank' },
  { ko: '광주은행', en: 'Gwangju Bank' }, { ko: '전북은행', en: 'Jeonbuk Bank' }, { ko: '제주은행', en: 'Jeju Bank' }, { ko: '우체국', en: 'Korea Post Office' }
]
const banks = bankOptions.map((b) => b.ko)

// 최고관리자(super_admin) 계정은 실수 방지를 위해 이 화면에서 수정할 수 없다(승격은 계속 허용).
function isLockedUser(u: AdminUserRow) {
  return u.role === 'super_admin'
}

function toggleSort(key: typeof sortKey.value) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}
function sortArrow(key: typeof sortKey.value) {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'asc' ? ' ▲' : ' ▼'
}

// 영업 조직처럼 몇 단계든(총판 > 팀장 > 팀원 > ...) 하부보기가 전체 하부 조직을 보여주도록,
// 직속 추천코드만 비교하지 않고 추천 관계 그래프를 끝까지 따라간다.
function downlineUsernamesOf(root: string) {
  const childrenMap = new Map<string, string[]>()
  for (const u of users.value) {
    const parent = (u.referralCode || '').trim()
    if (!parent) continue
    if (!childrenMap.has(parent)) childrenMap.set(parent, [])
    childrenMap.get(parent)!.push(u.username)
  }
  const result = new Set<string>()
  let frontier = [root]
  let depth = 0
  while (frontier.length && depth < 50) {
    const next: string[] = []
    for (const parent of frontier) {
      for (const child of childrenMap.get(parent) || []) {
        if (result.has(child) || child === root) continue
        result.add(child)
        next.push(child)
      }
    }
    frontier = next
    depth++
  }
  return result
}

const sortedUsers = computed(() => {
  const q = userSearch.value.trim().toLowerCase()
  let filtered = q
    ? users.value.filter((u) => [u.username, u.name, String(u.id)].some((v) => String(v || '').toLowerCase().includes(q)))
    : users.value.slice()
  if (referralFilter.value) {
    const downline = downlineUsernamesOf(referralFilter.value)
    filtered = filtered.filter((u) => downline.has(u.username))
  }
  if (fromDate.value) filtered = filtered.filter((u) => dateOnly(u.created_at) >= fromDate.value)
  if (toDate.value) filtered = filtered.filter((u) => dateOnly(u.created_at) <= toDate.value)
  const dir = sortDir.value === 'asc' ? 1 : -1
  return filtered.sort((a, b) => {
    const key = sortKey.value
    const av = a[key]
    const bv = b[key]
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av ?? '').localeCompare(String(bv ?? '')) * dir
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(sortedUsers.value.length / pageSize.value)))
const pagedUsers = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return sortedUsers.value.slice(start, start + pageSize.value)
})
const userPageNumbers = computed(() => {
  const total = totalPages.value
  const start = Math.floor((page.value - 1) / 5) * 5 + 1
  const end = Math.min(total, start + 4)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})
const showUserPageTail = computed(() => {
  const nums = userPageNumbers.value
  return nums.length > 0 && nums[nums.length - 1] < totalPages.value
})

watch(sortedUsers, () => {
  if (page.value > totalPages.value) page.value = totalPages.value
})

watch(pageSizeInput, (v) => {
  const next = Math.max(1, Math.min(500, Number.isFinite(Number(v)) ? Math.floor(Number(v)) : 20))
  if (next !== Number(v)) pageSizeInput.value = next
  if (page.value > totalPages.value) page.value = totalPages.value
})

async function saveUserRow(userId: number) {
  const draft = userDraft[userId]
  if (!draft) return
  const row = users.value.find((u) => u.id === userId)
  userSaving.value = userId
  error.value = null
  msg.value = null
  try {
    await $fetch('/api/admin/users/update', {
      method: 'POST',
      // 최고관리자(super_admin) 계정은 잔액 외 수정이 서버에서 막혀 있으므로, 다른 칸이 화면에
      // 그대로 있어도 요청에는 절대 같이 실어 보내지 않는다(그래야 잔액만 저장이 가능하다).
      body: row && isLockedUser(row)
        ? { userId, usdt: Number(draft.usdt) || 0 }
        : {
            userId,
            username: draft.username,
            name: draft.name,
            usdt: Number(draft.usdt) || 0,
            referralCode: draft.referralCode,
            role: draft.role,
            ...(draft.role !== 'user' && draft.role !== 'super_admin'
              ? {
                  settlementType: draft.settlementType,
                  settlementPercent: String(draft.settlementPercent ?? '').trim() === '' ? null : Number(draft.settlementPercent)
                }
              : {})
          }
    })
    await load()
    msg.value = t('저장되었습니다.', 'Saved.')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || t('저장 실패', 'Save failed')
  } finally {
    userSaving.value = null
  }
}

async function resetUserPassword(userId: number) {
  if (process.client && !window.confirm(t('이 유저의 비밀번호를 아이디와 동일하게 초기화할까요?', 'Reset this user\'s password to match their username?'))) return
  userResetting.value = userId
  error.value = null
  msg.value = null
  try {
    await $fetch('/api/admin/users/reset-password', { method: 'POST', body: { userId } })
    msg.value = t('비밀번호가 아이디와 동일하게 초기화되었습니다.', 'Password reset to match username.')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || t('초기화 실패', 'Reset failed')
  } finally {
    userResetting.value = null
  }
}

async function loginAsUser(userId: number) {
  if (process.client && !window.confirm(t('이 유저 계정으로 새 창에서 로그인할까요? (관리자 세션은 이 창에 그대로 유지됩니다)', 'Log in as this user in a new window? (Your admin session stays active in this window.)'))) return
  // 팝업 차단을 피하려면 window.open은 클릭 핸들러 안에서 await 전에(동기적으로) 호출해야 한다.
  const win = process.client ? window.open('about:blank', '_blank') : null
  loggingInAs.value = userId
  error.value = null
  try {
    const res = await $fetch<{ ok: true; username: string; token: string }>('/api/admin/users/login-as', {
      method: 'POST',
      body: { userId }
    })
    if (win) {
      if (res?.token) {
        win.location.href = `/impersonate?token=${encodeURIComponent(res.token)}`
      } else {
        win.close()
      }
    }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || t('로그인 실패', 'Login failed')
    win?.close()
  } finally {
    loggingInAs.value = null
  }
}

// 계좌정보 팝업
const accountModalOpen = ref(false)
const accountModalTarget = ref<AdminUserRow | null>(null)
const accountDraft = reactive({ bankName: banks[0], bankAccount: '', accountHolder: '' })
const accountModalSaving = ref(false)
const accountModalError = ref<string | null>(null)

function openAccountModal(u: AdminUserRow) {
  accountModalTarget.value = u
  accountDraft.bankName = u.bankName || banks[0]
  accountDraft.bankAccount = u.bankAccount || ''
  accountDraft.accountHolder = u.accountHolder || ''
  accountModalError.value = null
  accountModalOpen.value = true
}

function closeAccountModal() {
  accountModalOpen.value = false
  accountModalTarget.value = null
}

async function saveAccountModal() {
  if (!accountModalTarget.value) return
  accountModalSaving.value = true
  accountModalError.value = null
  try {
    await $fetch('/api/admin/users/update', {
      method: 'POST',
      body: {
        userId: accountModalTarget.value.id,
        bankName: accountDraft.bankName,
        bankAccount: accountDraft.bankAccount,
        accountHolder: accountDraft.accountHolder
      }
    })
    await load()
    closeAccountModal()
  } catch (e: any) {
    accountModalError.value = e?.data?.statusMessage || t('저장 실패', 'Save failed')
  } finally {
    accountModalSaving.value = false
  }
}

// 역할 관리(역할별 관리자 메뉴 권한)
type MenuKey = 'members' | 'online' | 'trades' | 'transfers' | 'positions' | 'messages' | 'settlement' | 'deposits'
const menuKeys: MenuKey[] = ['members', 'online', 'trades', 'transfers', 'positions', 'messages', 'settlement', 'deposits']
const menuMeta: Record<MenuKey, { labelKo: string; labelEn: string; editable: boolean; editLabelKo?: string; editLabelEn?: string }> = {
  members: { labelKo: '회원 목록', labelEn: 'Member List', editable: true, editLabelKo: '보유금액 수정', editLabelEn: 'Edit Balance' },
  online: { labelKo: '실시간 접속', labelEn: 'Live Sessions', editable: false },
  trades: { labelKo: '거래 내역', labelEn: 'Trade History', editable: false },
  transfers: { labelKo: '입출금 내역', labelEn: 'Deposit/Withdrawal History', editable: false },
  positions: { labelKo: '포지션 목록', labelEn: 'Position List', editable: true, editLabelKo: '포지션 수정', editLabelEn: 'Edit Positions' },
  messages: { labelKo: '쪽지관리', labelEn: 'Message Management', editable: true, editLabelKo: '어드민권한', editLabelEn: 'Admin Permission' },
  settlement: { labelKo: '정산내역', labelEn: 'Settlement History', editable: false },
  deposits: { labelKo: '입출금 내역', labelEn: 'Deposit/Withdrawal History', editable: true, editLabelKo: '입금/출금 승인/거절', editLabelEn: 'Approve/Reject Deposits/Withdrawals' }
}
type RoleRow = { id: string; label: string; menus: Record<MenuKey, { view: boolean; edit: boolean }>; tier: number; createdAt: string }
const roles = ref<RoleRow[]>([])
const tierDraft = reactive<Record<string, string>>({})
const savingTierId = ref<string | null>(null)
const rolesLoading = ref(false)
const rolesError = ref<string | null>(null)
const newRoleId = ref('')
const newRoleLabel = ref('')
const creatingRole = ref(false)
const newRoleError = ref<string | null>(null)
const deletingRoleId = ref<string | null>(null)

const roleModalOpen = ref(false)
const roleModalTarget = ref<RoleRow | null>(null)
const roleLabelDraft = ref('')
const roleMenuDraft = reactive<Record<MenuKey, { view: boolean; edit: boolean }>>({
  members: { view: true, edit: false },
  online: { view: true, edit: false },
  trades: { view: true, edit: false },
  transfers: { view: true, edit: false },
  positions: { view: true, edit: false },
  messages: { view: true, edit: false },
  settlement: { view: true, edit: false },
  deposits: { view: true, edit: false }
})
const roleModalSaving = ref(false)
const roleModalError = ref<string | null>(null)

async function loadRoles() {
  rolesLoading.value = true
  rolesError.value = null
  try {
    const data = await $fetch<{ roles: RoleRow[] }>('/api/admin/roles')
    roles.value = data.roles || []
    for (const r of roles.value) {
      if (savingTierId.value !== r.id) tierDraft[r.id] = String(r.tier)
    }
  } catch (e: any) {
    rolesError.value = e?.data?.statusMessage || t('역할 목록 불러오기 실패', 'Failed to load role list')
  } finally {
    rolesLoading.value = false
  }
}

async function saveRoleTier(r: RoleRow) {
  const raw = String(tierDraft[r.id] ?? '').trim()
  const tier = Number(raw)
  if (raw === '' || !Number.isFinite(tier)) {
    tierDraft[r.id] = String(r.tier)
    return
  }
  if (tier === r.tier) return
  savingTierId.value = r.id
  rolesError.value = null
  try {
    await $fetch('/api/admin/roles/update', { method: 'POST', body: { id: r.id, tier } })
    await loadRoles()
  } catch (e: any) {
    rolesError.value = e?.data?.statusMessage || t('등급 변경 실패', 'Failed to change tier')
    tierDraft[r.id] = String(r.tier)
  } finally {
    savingTierId.value = null
  }
}

const reorderingRoles = ref(false)
async function moveRoleRank(idx: number, dir: -1 | 1) {
  const next = idx + dir
  if (next < 0 || next >= roles.value.length || reorderingRoles.value) return
  const arr = [...roles.value]
  ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
  roles.value = arr
  reorderingRoles.value = true
  try {
    await $fetch('/api/admin/roles/reorder', {
      method: 'POST',
      body: { order: arr.map((r) => r.id) }
    })
  } catch (e: any) {
    rolesError.value = e?.data?.statusMessage || t('순서 변경 실패', 'Failed to change order')
    await loadRoles()
  } finally {
    reorderingRoles.value = false
  }
}

async function createRoleClick() {
  newRoleError.value = null
  if (!newRoleId.value || !newRoleLabel.value) {
    newRoleError.value = t('역할 ID와 이름을 모두 입력해주세요.', 'Please enter both a role ID and a name.')
    return
  }
  creatingRole.value = true
  try {
    await $fetch('/api/admin/roles/create', {
      method: 'POST',
      body: { id: newRoleId.value, label: newRoleLabel.value }
    })
    newRoleId.value = ''
    newRoleLabel.value = ''
    await loadRoles()
  } catch (e: any) {
    newRoleError.value = e?.data?.statusMessage || t('역할 추가 실패', 'Failed to add role')
  } finally {
    creatingRole.value = false
  }
}

async function deleteRoleClick(r: RoleRow) {
  if (process.client && !window.confirm(t(`"${r.label}" 역할을 삭제할까요?`, `Delete the "${r.label}" role?`))) return
  deletingRoleId.value = r.id
  rolesError.value = null
  try {
    await $fetch('/api/admin/roles/delete', { method: 'POST', body: { id: r.id } })
    await loadRoles()
  } catch (e: any) {
    rolesError.value = e?.data?.statusMessage || t('역할 삭제 실패', 'Failed to delete role')
  } finally {
    deletingRoleId.value = null
  }
}

function openRoleModal(r: RoleRow) {
  roleModalTarget.value = r
  roleLabelDraft.value = r.label
  for (const key of menuKeys) {
    roleMenuDraft[key].view = r.menus?.[key]?.view !== false
    roleMenuDraft[key].edit = Boolean(r.menus?.[key]?.edit)
  }
  roleModalError.value = null
  roleModalOpen.value = true
}

function closeRoleModal() {
  roleModalOpen.value = false
  roleModalTarget.value = null
}

async function saveRoleModal() {
  if (!roleModalTarget.value) return
  roleModalSaving.value = true
  roleModalError.value = null
  try {
    const menus: Record<string, { view: boolean; edit: boolean }> = {}
    for (const key of menuKeys) menus[key] = { view: roleMenuDraft[key].view, edit: roleMenuDraft[key].edit }
    await $fetch('/api/admin/roles/update', {
      method: 'POST',
      body: { id: roleModalTarget.value.id, label: roleLabelDraft.value, menus }
    })
    await loadRoles()
    closeRoleModal()
  } catch (e: any) {
    roleModalError.value = e?.data?.statusMessage || t('저장 실패', 'Save failed')
  } finally {
    roleModalSaving.value = false
  }
}

type KillEventRow = {
  id: number
  symbol: string
  direction: 'up' | 'down'
  percent: number
  basePrice: number
  shockedPrice: number
  createdAt: string
}
const killEvents = ref<KillEventRow[]>([])
const killEventsLoading = ref(false)
const killEventsError = ref<string | null>(null)
const killEventDeleting = ref<number | null>(null)

function formatKillTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('ko-KR', { hour12: false })
}

async function loadKillEvents() {
  killEventsLoading.value = true
  killEventsError.value = null
  try {
    const data = await $fetch<{ items: KillEventRow[] }>('/api/admin/kill/list')
    killEvents.value = data.items || []
  } catch (e: any) {
    killEventsError.value = e?.data?.statusMessage || t('킬 이력 불러오기 실패', 'Failed to load kill history')
  } finally {
    killEventsLoading.value = false
  }
}

async function deleteKillEvent(id: number) {
  killEventDeleting.value = id
  killEventsError.value = null
  try {
    await $fetch('/api/admin/kill/delete', { method: 'POST', body: { id } })
    killEvents.value = killEvents.value.filter((k) => k.id !== id)
  } catch (e: any) {
    killEventsError.value = e?.data?.statusMessage || t('삭제 실패', 'Delete failed')
  } finally {
    killEventDeleting.value = null
  }
}

type ProfitEventRow = {
  id: number
  symbol: string
  direction: 'up' | 'down'
  percent: number
  basePrice: number
  shockedPrice: number
  holdMs: number
  createdAt: string
}
const profitEvents = ref<ProfitEventRow[]>([])
const profitEventsLoading = ref(false)
const profitEventsError = ref<string | null>(null)
const profitEventDeleting = ref<number | null>(null)

async function loadProfitEvents() {
  profitEventsLoading.value = true
  profitEventsError.value = null
  try {
    const data = await $fetch<{ items: ProfitEventRow[] }>('/api/admin/profit/list')
    profitEvents.value = data.items || []
  } catch (e: any) {
    profitEventsError.value = e?.data?.statusMessage || t('상승STOP/하락STOP 이력 불러오기 실패', 'Failed to load Rise STOP/Fall STOP history')
  } finally {
    profitEventsLoading.value = false
  }
}

async function deleteProfitEvent(id: number) {
  profitEventDeleting.value = id
  profitEventsError.value = null
  try {
    await $fetch('/api/admin/profit/delete', { method: 'POST', body: { id } })
    profitEvents.value = profitEvents.value.filter((p) => p.id !== id)
  } catch (e: any) {
    profitEventsError.value = e?.data?.statusMessage || t('삭제 실패', 'Delete failed')
  } finally {
    profitEventDeleting.value = null
  }
}

const liquidationPercent = ref(40)
const liquidationPercentDraft = ref(40)
const liquidationSettingSaving = ref(false)
const liquidationSettingError = ref<string | null>(null)
const liquidationSettingMsg = ref<string | null>(null)

async function loadLiquidationSetting() {
  try {
    const data = await $fetch<{ liquidationRoe: number }>('/api/settings/system')
    const percent = Math.abs(Number(data.liquidationRoe) || 40)
    liquidationPercent.value = percent
    liquidationPercentDraft.value = percent
  } catch {
    // 기본값 유지
  }
}

async function saveLiquidationSetting() {
  const percent = Math.round(Number(liquidationPercentDraft.value))
  if (!Number.isFinite(percent) || percent < 1 || percent > 99) {
    liquidationSettingError.value = t('1~99 사이의 숫자를 입력해주세요.', 'Please enter a number between 1 and 99.')
    return
  }
  liquidationSettingSaving.value = true
  liquidationSettingError.value = null
  liquidationSettingMsg.value = null
  try {
    const res = await $fetch<{ liquidationRoe: number }>('/api/admin/settings/system', {
      method: 'POST',
      body: { liquidationRoe: -percent }
    })
    liquidationPercent.value = Math.abs(res.liquidationRoe)
    liquidationPercentDraft.value = liquidationPercent.value
    liquidationSettingMsg.value = t('저장되었습니다. 모든 유저에게 실시간으로 반영됩니다.', 'Saved. This applies to all users in real time.')
  } catch (e: any) {
    liquidationSettingError.value = e?.data?.statusMessage || t('저장 실패', 'Save failed')
  } finally {
    liquidationSettingSaving.value = false
  }
}

async function load() {
  loading.value = true
  error.value = null
  msg.value = null
  try {
    const data = await $fetch<{ users: AdminUserRow[] }>('/api/admin/users')
    users.value = data.users
    for (const u of users.value) {
      userDraft[u.id] = {
        username: u.username,
        name: u.name || '',
        usdt: Number(u.usdt ?? 0),
        referralCode: u.referralCode || '',
        role: u.role || 'user',
        settlementType: u.settlementType === 'referral' ? 'referral' : 'loss',
        settlementPercent: typeof u.settlementPercent === 'number' ? String(u.settlementPercent) : ''
      }
    }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || t('불러오기 실패', 'Failed to load')
  } finally {
    loading.value = false
  }
}

// 정산/기타 설정
const miscDraft = reactive({
  telegramUrl: '',
  krwPerUsdt: 0,
  lossSettlementPercent: 0,
  referralSettlementPercent: 0,
  menuOrder: menuKeys.filter((k) => k !== 'transfers') as string[]
})

function moveMenuOrder(idx: number, dir: -1 | 1) {
  const next = idx + dir
  if (next < 0 || next >= miscDraft.menuOrder.length) return
  const arr = miscDraft.menuOrder
  ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
}
const miscSaving = ref(false)
const miscError = ref<string | null>(null)
const miscMsg = ref<string | null>(null)
const dailyKrwRate = ref(0)
const dailyKrwRateDay = ref('')

// 메뉴구성: 비회원도 보는 최상단 메인 메뉴(관리자 전용 서브메뉴와는 별개)
type MainNavKey = 'coin' | 'stock' | 'kr' | 'markets' | 'wallet' | 'invest' | 'support'
const MAIN_NAV_KEYS: MainNavKey[] = ['coin', 'stock', 'kr', 'markets', 'wallet', 'invest', 'support']
const MAIN_NAV_LABELS: Record<MainNavKey, { ko: string; en: string }> = {
  coin: { ko: '코인선물', en: 'Crypto Futures' },
  stock: { ko: '해외주식', en: 'Overseas Stocks' },
  kr: { ko: '국내주식', en: 'Domestic Stocks' },
  markets: { ko: '마켓', en: 'Markets' },
  wallet: { ko: '내 지갑', en: 'My Wallet' },
  invest: { ko: '투자내역', en: 'Investment History' },
  support: { ko: '고객센터', en: 'Support' }
}
const mainNavDraft = reactive<{ order: MainNavKey[]; hidden: MainNavKey[] }>({
  order: [...MAIN_NAV_KEYS],
  hidden: []
})
const mainNavSaving = ref(false)
const mainNavError = ref<string | null>(null)
const mainNavMsg = ref<string | null>(null)

// 카드 디자인: 거래내역 "카드" 버튼으로 뜨는 수익카드(청산카드)의 색상/글자크기/크기 커스터마이징.
// 미리보기에서 요소를 클릭하면 그 요소에 맞는 필드만 오른쪽 패널에 나타나는 방식(서버의
// ProfitCardStyle/DEFAULT_PROFIT_CARD_STYLE과 항상 같은 값을 유지해야 함).
type ProfitCardStyle = {
  fontFamily: string
  cardWidth: number
  cardPaddingX: number
  cardPaddingY: number
  cardRadius: number
  borderWidth: number
  borderColor: string
  bgColor: string
  gridColor: string
  gridSize: number
  positiveColor: string
  negativeColor: string
  logoFontSize: number
  logoColor: string
  roeFontSize: number
  wonFontSize: number
  wonTextColor: string
  badgeFontSize: number
  symbolFontSize: number
  symbolTextColor: string
  longBadgeBg: string
  longBadgeText: string
  shortBadgeBg: string
  shortBadgeText: string
  statBoxBg: string
  statBoxRadius: number
  statBoxPaddingX: number
  statBoxPaddingY: number
  statLabelColor: string
  statLabelFontSize: number
  statValueColor: string
  statValueFontSize: number
  offsets: Record<string, { x: number; y: number; s?: number }>
}
const DEFAULT_PROFIT_CARD_STYLE: ProfitCardStyle = {
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  cardWidth: 340,
  cardPaddingX: 24,
  cardPaddingY: 28,
  cardRadius: 16,
  borderWidth: 1,
  borderColor: '#0e3a52',
  bgColor: '#06121d',
  gridColor: '#04101a',
  gridSize: 28,
  positiveColor: '#22c55e',
  negativeColor: '#ef4444',
  logoFontSize: 16,
  logoColor: '#ffffff',
  roeFontSize: 40,
  wonFontSize: 17,
  wonTextColor: '#94a3b8',
  badgeFontSize: 14,
  symbolFontSize: 16,
  symbolTextColor: '#e2e8f0',
  longBadgeBg: '#22c55e',
  longBadgeText: '#ffffff',
  shortBadgeBg: '#ef4444',
  shortBadgeText: '#ffffff',
  statBoxBg: '#081726',
  statBoxRadius: 12,
  statBoxPaddingX: 16,
  statBoxPaddingY: 14,
  statLabelColor: '#64748b',
  statLabelFontSize: 12,
  statValueColor: '#e2e8f0',
  statValueFontSize: 16,
  offsets: {}
}

const PROFIT_CARD_FONT_OPTIONS = [
  { value: 'ui-sans-serif, system-ui, sans-serif', labelKo: '기본(시스템 폰트)', labelEn: 'Default (System Font)' },
  { value: "'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif", labelKo: '맑은 고딕', labelEn: 'Malgun Gothic' },
  { value: "Georgia, 'Times New Roman', serif", labelKo: '세리프(Georgia)', labelEn: 'Serif (Georgia)' },
  { value: "'Courier New', ui-monospace, monospace", labelKo: '고정폭(Courier New)', labelEn: 'Monospace (Courier New)' },
  { value: "'Trebuchet MS', 'Segoe UI', sans-serif", labelKo: 'Trebuchet MS', labelEn: 'Trebuchet MS' },
  { value: 'Arial, Helvetica, sans-serif', labelKo: 'Arial', labelEn: 'Arial' }
]

type ProfitCardTarget = 'card' | 'logo' | 'divider' | 'roe' | 'won' | 'badge' | 'symbol' | 'statBox' | 'statLabel' | 'statValue'
const selectedTarget = ref<ProfitCardTarget>('card')
// 지금 방향키로 움직일 "개별 항목"의 키(없으면 null). 글자크기/색 설정 패널은 selectedTarget(그룹) 기준이고,
// 위치 이동은 정보박스의 라벨/값처럼 같은 그룹 안에서도 항목마다 따로 움직일 수 있게 이 키로 구분한다.
const selectedOffsetKey = ref<string | null>(null)
function selectTarget(t: ProfitCardTarget, offsetKey: string | null = null) {
  selectedTarget.value = t
  selectedOffsetKey.value = offsetKey
}
const STAT_BOX_KEYS = ['lev', 'pnl', 'entry', 'exit']

const OFFSET_LIMIT = 200
function cardOffsetStyle(key: string) {
  const o = profitCardDraft.offsets?.[key]
  return o && (o.x || o.y) ? { transform: `translate(${o.x}px, ${o.y}px)` } : {}
}
const selectedOffset = computed(() => {
  const o = selectedOffsetKey.value ? profitCardDraft.offsets?.[selectedOffsetKey.value] : null
  return { x: o?.x || 0, y: o?.y || 0, s: o?.s || 0 }
})
// 항목 크기 조정값(px): 글자는 글자 크기에, 그림/도형은 가로·세로 크기에 더한다.
const SIZE_MIN = -40
const SIZE_MAX = 1000
function cardSz(key: string) {
  return profitCardDraft.offsets?.[key]?.s || 0
}
function cardFs(base: number, key: string) {
  return Math.max(6, base + cardSz(key)) + 'px'
}
function cardBoxSizeStyle() {
  const s = cardSz('statBox')
  return s ? { width: `calc(100% + ${s}px)`, marginLeft: `${-s / 2}px` } : {}
}
function changeSelectedSize(ds: number) {
  const k = selectedOffsetKey.value
  if (!k) return
  const cur = profitCardDraft.offsets?.[k] || { x: 0, y: 0 }
  const s = Math.max(SIZE_MIN, Math.min(SIZE_MAX, (cur.s || 0) + ds))
  const entry: { x: number; y: number; s?: number } = { x: cur.x, y: cur.y }
  if (s) entry.s = s
  profitCardDraft.offsets = { ...profitCardDraft.offsets, [k]: entry }
}
function moveSelectedOffset(dx: number, dy: number) {
  const k = selectedOffsetKey.value
  if (!k) return
  const cur = profitCardDraft.offsets?.[k] || { x: 0, y: 0 }
  const clamp = (n: number) => Math.max(-OFFSET_LIMIT, Math.min(OFFSET_LIMIT, n))
  const entry: { x: number; y: number; s?: number } = { x: clamp(cur.x + dx), y: clamp(cur.y + dy) }
  if (cur.s) entry.s = cur.s
  profitCardDraft.offsets = { ...profitCardDraft.offsets, [k]: entry }
}
function resetSelectedOffset() {
  const k = selectedOffsetKey.value
  if (!k) return
  const next = { ...profitCardDraft.offsets }
  delete next[k]
  profitCardDraft.offsets = next
}
// 항목을 클릭해 선택한 뒤 키보드 방향키로 1px(Shift: 10px)씩 이동. 입력칸/슬라이더에 포커스가 있을 땐 건드리지 않는다.
function onCardArrowKey(e: KeyboardEvent) {
  if (activeTab.value !== 'profitCard' || !selectedOffsetKey.value) return
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  const step = e.shiftKey ? 10 : 1
  if (e.key === 'Escape') {
    selectedOffsetKey.value = null
    return
  }
  if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
    e.preventDefault()
    changeSelectedSize(step)
    return
  }
  if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') {
    e.preventDefault()
    changeSelectedSize(-step)
    return
  }
  let dx = 0
  let dy = 0
  if (e.key === 'ArrowLeft') dx = -step
  else if (e.key === 'ArrowRight') dx = step
  else if (e.key === 'ArrowUp') dy = -step
  else if (e.key === 'ArrowDown') dy = step
  else return
  e.preventDefault()
  moveSelectedOffset(dx, dy)
}
onMounted(() => window.addEventListener('keydown', onCardArrowKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onCardArrowKey))

const PROFIT_CARD_TARGET_LABELS: Record<ProfitCardTarget, { ko: string; en: string }> = {
  card: { ko: '카드 전체', en: 'Whole Card' },
  logo: { ko: '로고(BITDUCK)', en: 'Logo (BITDUCK)' },
  divider: { ko: '구분선', en: 'Divider Line' },
  roe: { ko: '수익률(%) 큰 글씨', en: 'ROE (%) Large Text' },
  won: { ko: '원화 보조텍스트', en: 'KRW Subtext' },
  badge: { ko: '롱/숏 배지', en: 'Long/Short Badge' },
  symbol: { ko: '종목명', en: 'Symbol Name' },
  statBox: { ko: '하단 정보박스(공통)', en: 'Bottom Info Box (Shared)' },
  statLabel: { ko: '정보박스 라벨', en: 'Info Box Label' },
  statValue: { ko: '정보박스 값', en: 'Info Box Value' }
}
const PROFIT_CARD_TARGET_HINTS: Partial<Record<ProfitCardTarget, { ko: string; en: string }>> = {
  statValue: { ko: '"손익" 값의 색은 위 "수익률" 항목의 수익(+)/손실(-) 색을 그대로 따릅니다.', en: 'The color of the "P&L" value follows the profit(+)/loss(-) color from the "ROE" item above.' },
  badge: { ko: '롱/숏 각각 배경색·글자색을 따로 지정할 수 있습니다.', en: 'You can set separate background and text colors for Long and Short.' },
  divider: { ko: '구분선은 위치만 조정할 수 있습니다(색은 수익/손실 색을 따릅니다).', en: 'The divider only has a position setting (its color follows the profit/loss color).' }
}

type ProfitCardNumField = { key: keyof ProfitCardStyle; labelKo: string; labelEn: string; min: number; max: number }
type ProfitCardColorField = { key: keyof ProfitCardStyle; labelKo: string; labelEn: string }

const PROFIT_CARD_TARGET_NUMBER_FIELDS: Record<ProfitCardTarget, ProfitCardNumField[]> = {
  card: [
    { key: 'cardWidth', labelKo: '카드 너비', labelEn: 'Card Width', min: 260, max: 420 },
    { key: 'cardPaddingX', labelKo: '가로 여백', labelEn: 'Horizontal Padding', min: 8, max: 48 },
    { key: 'cardPaddingY', labelKo: '세로 여백', labelEn: 'Vertical Padding', min: 8, max: 56 },
    { key: 'cardRadius', labelKo: '모서리 둥글기', labelEn: 'Corner Radius', min: 0, max: 32 },
    { key: 'borderWidth', labelKo: '테두리 두께', labelEn: 'Border Width', min: 0, max: 4 },
    { key: 'gridSize', labelKo: '격자 크기', labelEn: 'Grid Size', min: 8, max: 48 }
  ],
  logo: [{ key: 'logoFontSize', labelKo: '글자 크기', labelEn: 'Font Size', min: 10, max: 28 }],
  divider: [],
  roe: [{ key: 'roeFontSize', labelKo: '글자 크기', labelEn: 'Font Size', min: 24, max: 60 }],
  won: [{ key: 'wonFontSize', labelKo: '글자 크기', labelEn: 'Font Size', min: 10, max: 28 }],
  badge: [{ key: 'badgeFontSize', labelKo: '글자 크기', labelEn: 'Font Size', min: 10, max: 22 }],
  symbol: [{ key: 'symbolFontSize', labelKo: '글자 크기', labelEn: 'Font Size', min: 10, max: 26 }],
  statBox: [
    { key: 'statBoxRadius', labelKo: '모서리 둥글기', labelEn: 'Corner Radius', min: 0, max: 24 },
    { key: 'statBoxPaddingX', labelKo: '가로 여백', labelEn: 'Horizontal Padding', min: 4, max: 32 },
    { key: 'statBoxPaddingY', labelKo: '세로 여백', labelEn: 'Vertical Padding', min: 4, max: 32 }
  ],
  statLabel: [{ key: 'statLabelFontSize', labelKo: '글자 크기', labelEn: 'Font Size', min: 8, max: 18 }],
  statValue: [{ key: 'statValueFontSize', labelKo: '글자 크기', labelEn: 'Font Size', min: 10, max: 24 }]
}
const PROFIT_CARD_TARGET_COLOR_FIELDS: Record<ProfitCardTarget, ProfitCardColorField[]> = {
  card: [
    { key: 'borderColor', labelKo: '테두리 색', labelEn: 'Border Color' },
    { key: 'bgColor', labelKo: '배경색', labelEn: 'Background Color' },
    { key: 'gridColor', labelKo: '격자무늬 색', labelEn: 'Grid Pattern Color' }
  ],
  logo: [{ key: 'logoColor', labelKo: '글자색', labelEn: 'Text Color' }],
  divider: [],
  roe: [
    { key: 'positiveColor', labelKo: '수익(+) 색', labelEn: 'Profit (+) Color' },
    { key: 'negativeColor', labelKo: '손실(-) 색', labelEn: 'Loss (-) Color' }
  ],
  won: [{ key: 'wonTextColor', labelKo: '글자색', labelEn: 'Text Color' }],
  badge: [
    { key: 'longBadgeBg', labelKo: '롱 배경색', labelEn: 'Long Background Color' },
    { key: 'longBadgeText', labelKo: '롱 글자색', labelEn: 'Long Text Color' },
    { key: 'shortBadgeBg', labelKo: '숏 배경색', labelEn: 'Short Background Color' },
    { key: 'shortBadgeText', labelKo: '숏 글자색', labelEn: 'Short Text Color' }
  ],
  symbol: [{ key: 'symbolTextColor', labelKo: '글자색', labelEn: 'Text Color' }],
  statBox: [{ key: 'statBoxBg', labelKo: '배경색', labelEn: 'Background Color' }],
  statLabel: [{ key: 'statLabelColor', labelKo: '글자색', labelEn: 'Text Color' }],
  statValue: [{ key: 'statValueColor', labelKo: '글자색', labelEn: 'Text Color' }]
}
const currentNumberFields = computed(() => PROFIT_CARD_TARGET_NUMBER_FIELDS[selectedTarget.value])
const currentColorFields = computed(() => PROFIT_CARD_TARGET_COLOR_FIELDS[selectedTarget.value])

const PROFIT_CARD_PREVIEW_VARIANTS = [
  {
    key: 'profit',
    titleKo: '수익일 때',
    titleEn: 'When profitable',
    positive: true,
    roeText: '+12.34%',
    wonTextKo: '+173,407 원',
    wonTextEn: '+₩173,407',
    side: 'long' as const,
    symbol: 'SAMSUNGUSDT',
    leverage: 10,
    pnlText: '+128.45 USDT',
    entry: '68500.00',
    exit: '71950.00'
  },
  {
    key: 'loss',
    titleKo: '손실일 때',
    titleEn: 'When at a loss',
    positive: false,
    roeText: '−8.21%',
    wonTextKo: '-54,320 원',
    wonTextEn: '-₩54,320',
    side: 'short' as const,
    symbol: 'SKHYNIXUSDT',
    leverage: 10,
    pnlText: '-42.10 USDT',
    entry: '182300.00',
    exit: '175100.00'
  }
]
const profitCardDraft = reactive<ProfitCardStyle>({ ...DEFAULT_PROFIT_CARD_STYLE, offsets: {} })
const profitCardSaving = ref(false)
const profitCardError = ref<string | null>(null)
const profitCardMsg = ref<string | null>(null)

function resetProfitCardStyle() {
  Object.assign(profitCardDraft, DEFAULT_PROFIT_CARD_STYLE, { offsets: {} })
  selectedOffsetKey.value = null
}

async function saveProfitCardStyle() {
  profitCardSaving.value = true
  profitCardError.value = null
  profitCardMsg.value = null
  try {
    await $fetch('/api/admin/settings/misc', { method: 'POST', body: { profitCardStyle: { ...profitCardDraft, offsets: JSON.parse(JSON.stringify(profitCardDraft.offsets || {})) } } })
    profitCardMsg.value = t('저장되었습니다.', 'Saved.')
  } catch (e: any) {
    profitCardError.value = e?.data?.statusMessage || t('저장 실패', 'Save failed')
  } finally {
    profitCardSaving.value = false
  }
}

function moveMainNavOrder(idx: number, dir: -1 | 1) {
  const next = idx + dir
  if (next < 0 || next >= mainNavDraft.order.length) return
  const arr = mainNavDraft.order
  ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
}
function toggleMainNavHidden(key: MainNavKey) {
  mainNavDraft.hidden = mainNavDraft.hidden.includes(key) ? mainNavDraft.hidden.filter((k) => k !== key) : [...mainNavDraft.hidden, key]
}
async function saveMainNavSettings() {
  mainNavSaving.value = true
  mainNavError.value = null
  mainNavMsg.value = null
  try {
    await $fetch('/api/admin/settings/misc', {
      method: 'POST',
      body: { mainNavOrder: mainNavDraft.order, mainNavHidden: mainNavDraft.hidden }
    })
    mainNavMsg.value = t('저장되었습니다.', 'Saved.')
  } catch (e: any) {
    mainNavError.value = e?.data?.statusMessage || t('저장 실패', 'Save failed')
  } finally {
    mainNavSaving.value = false
  }
}

function fmt0(v: number) {
  return Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

async function loadMiscSettings() {
  try {
    const data = await $fetch<any>('/api/admin/settings/misc')
    miscDraft.telegramUrl = data.telegramUrl || ''
    miscDraft.krwPerUsdt = Number(data.krwPerUsdt || 0)
    miscDraft.lossSettlementPercent = Number(data.lossSettlementPercent || 0)
    miscDraft.referralSettlementPercent = Number(data.referralSettlementPercent || 0)
    if (Array.isArray(data.menuOrder) && data.menuOrder.length) {
      const known = new Set(menuKeys.filter((k) => k !== 'transfers'))
      const fromServer = data.menuOrder.filter((k: string) => known.has(k as MenuKey))
      const missing = menuKeys.filter((k) => k !== 'transfers' && !fromServer.includes(k))
      miscDraft.menuOrder = [...fromServer, ...missing]
    }
    dailyKrwRate.value = Number(data.dailyKrwRate || 0)
    dailyKrwRateDay.value = String(data.dailyKrwRateDay || '')

    if (Array.isArray(data.mainNavOrder) && data.mainNavOrder.length) {
      const known = new Set(MAIN_NAV_KEYS)
      const fromServer = data.mainNavOrder.filter((k: string) => known.has(k as MainNavKey)) as MainNavKey[]
      const missing = MAIN_NAV_KEYS.filter((k) => !fromServer.includes(k))
      mainNavDraft.order = [...fromServer, ...missing]
    }
    if (Array.isArray(data.mainNavHidden)) {
      const known = new Set(MAIN_NAV_KEYS)
      mainNavDraft.hidden = data.mainNavHidden.filter((k: string) => known.has(k as MainNavKey))
    }
    if (data.profitCardStyle && typeof data.profitCardStyle === 'object') {
      Object.assign(profitCardDraft, DEFAULT_PROFIT_CARD_STYLE, data.profitCardStyle, { offsets: { ...(data.profitCardStyle.offsets || {}) } })
    }
  } catch {
    // 기본값 유지
  }
}

async function saveMiscSettings() {
  miscSaving.value = true
  miscError.value = null
  miscMsg.value = null
  try {
    await $fetch('/api/admin/settings/misc', {
      method: 'POST',
      body: {
        telegramUrl: miscDraft.telegramUrl,
        krwPerUsdt: Number(miscDraft.krwPerUsdt) || 0,
        lossSettlementPercent: Number(miscDraft.lossSettlementPercent) || 0,
        referralSettlementPercent: Number(miscDraft.referralSettlementPercent) || 0,
        menuOrder: miscDraft.menuOrder
      }
    })
    miscMsg.value = t('저장되었습니다.', 'Saved.')
  } catch (e: any) {
    miscError.value = e?.data?.statusMessage || t('저장 실패', 'Save failed')
  } finally {
    miscSaving.value = false
  }
}

// DB 연결 상태: 실제 데이터와 무관하게, 지금 배포된 버전 표시를 SQLite/Supabase 양쪽에
// 직접 써보고 다시 읽어서 확인하는 진단 기능.
type DbHealthCheckResult = { ok: boolean; marker?: string | null; checkedAt?: string | null; detail?: string; projectName?: string; error?: string }
type DbHealthResponse = { marker: string; activeMode: 'sqlite' | 'supabase'; sqlite: DbHealthCheckResult; supabase: DbHealthCheckResult }
const dbHealth = ref<DbHealthResponse | null>(null)
const dbHealthLoading = ref(false)
const dbHealthError = ref<string | null>(null)

async function runDbHealthCheck() {
  dbHealthLoading.value = true
  dbHealthError.value = null
  try {
    dbHealth.value = await $fetch<DbHealthResponse>('/api/admin/db-health-check', { method: 'POST' })
  } catch (e: any) {
    dbHealthError.value = e?.data?.statusMessage || t('확인 중 오류가 발생했습니다.', 'An error occurred during the check.')
  } finally {
    dbHealthLoading.value = false
  }
}

watch(activeTab, (t) => {
  if (t === 'dbHealth' && !dbHealth.value && !dbHealthLoading.value) {
    runDbHealthCheck()
  }
})

await load()
await loadLiquidationSetting()
await loadMiscSettings()
await loadKillEvents()
await loadProfitEvents()
await loadRoles()
</script>

<style scoped>
.sortable-th {
  color: rgb(203 213 225 / 0.9); /* slate-300, brighter than the default slate-500 header text */
  transition: color 0.15s ease;
}
.sortable-th:hover {
  color: #fff;
}
.sortable-th .sort-icon {
  margin-left: 2px;
  font-size: 12px;
  color: rgb(148 163 184 / 0.6);
}
.sortable-th:hover .sort-icon {
  color: rgb(203 213 225 / 0.9);
}

.date-input {
  position: relative;
  min-width: 140px;
  color-scheme: dark;
}
.date-input::-webkit-calendar-picker-indicator {
  margin-left: auto;
  cursor: pointer;
  opacity: 0.9;
}
</style>
