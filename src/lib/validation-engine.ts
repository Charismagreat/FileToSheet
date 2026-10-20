/**
 * src/lib/validation-engine.ts
 * 스프레드시트 컬럼별 실시간 데이터 유효성 검증 엔진 (Validation Engine)
 */

export interface ValidationRule {
  id: string;
  name: string;
  targetCol: string; // 검증 대상 컬럼 (예: '금액', '합계금액', '세액', '주문번호')
  type: 'ARITHMETIC_MULTIPLY' | 'ARITHMETIC_SUM' | 'PERCENTAGE' | 'REGEX' | 'DUPLICATE_ENTRY' | 'UNIQUE_COLUMN' | 'COMPOSITE_UNIQUE' | 'CUSTOM';
  operandCols?: string[]; // 피연산자 컬럼 (예: ['수량', '단가'] 또는 ['공급가액', '세액'] 또는 ['거래일자', '거래처명'])
  compositeCols?: string[]; // 복합 고유 키 컬럼들 (예: ['주문일자', '고객ID', '상품코드'])
  percentage?: number; // 퍼센트 검증용 (예: 0.1)
  tolerance?: number; // 허용 오차 (원 단위 절사/반올림용, 기본 1)
  pattern?: string; // 정규식 패턴 (예: YYYY-MM-DD)
  errorMessage?: string;
  enabled: boolean;
  naturalPrompt?: string; // 자연어 프롬프트 원문
  caseSensitive?: boolean;
  trimWhitespace?: boolean;
}

export interface CellValidationError {
  rowIdx: number;
  colKey: string;
  ruleId?: string;
  ruleType?: ValidationRule['type'];
  ruleName: string;
  expectedValue: string | number;
  actualValue: string | number;
  message: string;
  suggestedFix?: string | number;
}

export interface ValidationResult {
  hasErrors: boolean;
  totalErrorCount: number;
  errorRowsCount: number;
  errorRowIndices: Set<number>;
  errorMap: Map<string, CellValidationError>; // key: `${rowIdx}_${colKey}`
}

/**
 * 통화, 쉼표, 원화 기호 등이 포함된 문자열에서 순수 숫자 추출
 */
export function parseNumericValue(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const clean = String(val).replace(/,/g, '').replace(/[^\d.-]/g, '').trim();
  if (!clean) return null;
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

/**
 * 시트 헤더 목록을 분석하여 적용 가능한 지능형 기본 검증 규칙 자동 생성
 */
export function generateDefaultRules(headers: string[]): ValidationRule[] {
  const rules: ValidationRule[] = [];

  // 1. 수량 × 단가 = 금액 검산 규칙
  const qtyCol = headers.find((h) => h === '수량' || h.includes('수량'));
  const priceCol = headers.find((h) => h === '단가' || h.includes('단가'));
  const amountCol = headers.find(
    (h) => h === '금액' || h === '공급가액' || h.includes('금액') || h.includes('공급가')
  );

  if (qtyCol && priceCol && amountCol && amountCol !== qtyCol && amountCol !== priceCol) {
    rules.push({
      id: 'default_qty_price_amount',
      name: `${qtyCol} × ${priceCol} = ${amountCol} 검산`,
      targetCol: amountCol,
      type: 'ARITHMETIC_MULTIPLY',
      operandCols: [qtyCol, priceCol],
      tolerance: 1,
      errorMessage: `${amountCol}은 ${qtyCol}과 ${priceCol}을 곱한 값과 일치해야 합니다.`,
      enabled: true,
      naturalPrompt: `${amountCol}열은 ${qtyCol}과 ${priceCol}을 곱한 금액이어야 해`,
    });
  }

  // 2. 공급가액 + 세액(부가세) = 합계금액 검산 규칙
  const supplyCol = headers.find((h) => h === '공급가액' || (h.includes('공급') && h.includes('가')));
  const taxCol = headers.find((h) => h === '세액' || h === '부가세' || h.includes('세액'));
  const totalCol = headers.find((h) => h === '합계' || h === '합계금액' || h.includes('합계'));

  if (supplyCol && taxCol && totalCol && totalCol !== supplyCol && totalCol !== taxCol) {
    rules.push({
      id: 'default_supply_tax_total',
      name: `${supplyCol} + ${taxCol} = ${totalCol} 검산`,
      targetCol: totalCol,
      type: 'ARITHMETIC_SUM',
      operandCols: [supplyCol, taxCol],
      tolerance: 1,
      errorMessage: `${totalCol}은 ${supplyCol}과 ${taxCol}의 합계와 일치해야 합니다.`,
      enabled: true,
      naturalPrompt: `${totalCol}은 ${supplyCol}과 ${taxCol}을 더한 값이어야 해`,
    });
  }

  // 3. 부가세 10% 비율 검산 규칙
  if (supplyCol && taxCol && supplyCol !== taxCol) {
    rules.push({
      id: 'default_vat_ten_percent',
      name: `${taxCol} = ${supplyCol}의 10% 부가세율 검증`,
      targetCol: taxCol,
      type: 'PERCENTAGE',
      operandCols: [supplyCol],
      percentage: 0.1,
      tolerance: 2, // 원 단위 절사/반올림 오차 허용
      errorMessage: `${taxCol}은 ${supplyCol}의 10% 부가세율과 일치해야 합니다.`,
      enabled: true,
      naturalPrompt: `${taxCol}은 ${supplyCol}의 10%여야 해`,
    });
  }

  // 4. 날짜 포맷 검증 규칙
  const dateCol = headers.find((h) => h.includes('일자') || h.includes('날짜'));
  if (dateCol) {
    rules.push({
      id: 'default_date_format',
      name: `${dateCol} 표준 날짜 규격(YYYY-MM-DD) 검증`,
      targetCol: dateCol,
      type: 'REGEX',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      errorMessage: `${dateCol}은 YYYY-MM-DD 표준 날짜 규격이어야 합니다.`,
      enabled: false, // 기본은 비활성, 사용자가 선택 시 켜짐
      naturalPrompt: `${dateCol}은 YYYY-MM-DD 날짜 형식이어야 해`,
    });
  }

  return rules;
}

/**
 * 시트의 모든 행에 대해 활성화된 규칙들을 실시간 평가
 */
export function validateSheetRows(
  rows: Record<string, any>[],
  rules: ValidationRule[]
): ValidationResult {
  const activeRules = rules.filter((r) => r.enabled);
  const errorMap = new Map<string, CellValidationError>();
  const errorRowIndices = new Set<number>();

  if (activeRules.length === 0 || rows.length === 0) {
    return {
      hasErrors: false,
      totalErrorCount: 0,
      errorRowsCount: 0,
      errorRowIndices,
      errorMap,
    };
  }

  rows.forEach((row, rowIdx) => {
    activeRules.forEach((rule) => {
      const rawTarget = row[rule.targetCol];
      // 타겟 값이 비어있는 행은 검증 건너뛰기
      if (rawTarget === undefined || rawTarget === null || String(rawTarget).trim() === '') {
        return;
      }

      // 1. 곱셈 산술 검산 (예: 수량 * 단가 = 금액)
      if (rule.type === 'ARITHMETIC_MULTIPLY' && rule.operandCols && rule.operandCols.length >= 2) {
        const valA = parseNumericValue(row[rule.operandCols[0]]);
        const valB = parseNumericValue(row[rule.operandCols[1]]);
        const actual = parseNumericValue(rawTarget);

        if (valA !== null && valB !== null && actual !== null) {
          const expected = Math.round(valA * valB);
          const tolerance = rule.tolerance ?? 1;
          const diff = Math.abs(actual - expected);

          if (diff > tolerance) {
            const errorKey = `${rowIdx}_${rule.targetCol}`;
            const formattedExpected = expected.toLocaleString('ko-KR');
            const formattedActual = actual.toLocaleString('ko-KR');
            errorMap.set(errorKey, {
              rowIdx,
              colKey: rule.targetCol,
              ruleId: rule.id,
              ruleType: rule.type,
              ruleName: rule.name,
              expectedValue: expected,
              actualValue: actual,
              suggestedFix: formattedExpected,
              message: `계산 불일치: ${rule.operandCols[0]}(${valA.toLocaleString()}) × ${rule.operandCols[1]}(${valB.toLocaleString()}) = ${formattedExpected}원 (현재값: ${formattedActual}원 / 오차: ${(actual - expected).toLocaleString()}원)`,
            });
            errorRowIndices.add(rowIdx);
          }
        }
      }

      // 2. 덧셈 산술 검산 (예: 공급가액 + 세액 = 합계금액)
      else if (rule.type === 'ARITHMETIC_SUM' && rule.operandCols && rule.operandCols.length >= 2) {
        const valA = parseNumericValue(row[rule.operandCols[0]]);
        const valB = parseNumericValue(row[rule.operandCols[1]]);
        const actual = parseNumericValue(rawTarget);

        if (valA !== null && valB !== null && actual !== null) {
          const expected = Math.round(valA + valB);
          const tolerance = rule.tolerance ?? 1;
          const diff = Math.abs(actual - expected);

          if (diff > tolerance) {
            const errorKey = `${rowIdx}_${rule.targetCol}`;
            const formattedExpected = expected.toLocaleString('ko-KR');
            const formattedActual = actual.toLocaleString('ko-KR');
            errorMap.set(errorKey, {
              rowIdx,
              colKey: rule.targetCol,
              ruleId: rule.id,
              ruleType: rule.type,
              ruleName: rule.name,
              expectedValue: expected,
              actualValue: actual,
              suggestedFix: formattedExpected,
              message: `합계 불일치: ${rule.operandCols[0]}(${valA.toLocaleString()}) + ${rule.operandCols[1]}(${valB.toLocaleString()}) = ${formattedExpected}원 (현재값: ${formattedActual}원)`,
            });
            errorRowIndices.add(rowIdx);
          }
        }
      }

      // 3. 퍼센트/부가세 검산 (예: 세액 = 공급가액 * 0.1)
      else if (rule.type === 'PERCENTAGE' && rule.operandCols && rule.operandCols.length >= 1) {
        const valBase = parseNumericValue(row[rule.operandCols[0]]);
        const actual = parseNumericValue(rawTarget);
        const rate = rule.percentage ?? 0.1;

        if (valBase !== null && actual !== null) {
          const expected = Math.round(valBase * rate);
          const tolerance = rule.tolerance ?? 2;
          const diff = Math.abs(actual - expected);

          if (diff > tolerance) {
            const errorKey = `${rowIdx}_${rule.targetCol}`;
            const formattedExpected = expected.toLocaleString('ko-KR');
            const formattedActual = actual.toLocaleString('ko-KR');
            errorMap.set(errorKey, {
              rowIdx,
              colKey: rule.targetCol,
              ruleId: rule.id,
              ruleType: rule.type,
              ruleName: rule.name,
              expectedValue: expected,
              actualValue: actual,
              suggestedFix: formattedExpected,
              message: `부가세율 불일치: ${rule.operandCols[0]}(${valBase.toLocaleString()})의 ${rate * 100}% = ${formattedExpected}원 (현재값: ${formattedActual}원)`,
            });
            errorRowIndices.add(rowIdx);
          }
        }
      }

      // 4. 정규식 포맷 검증 (예: YYYY-MM-DD 날짜 등)
      else if (rule.type === 'REGEX' && rule.pattern) {
        try {
          const regex = new RegExp(rule.pattern);
          const strVal = String(rawTarget).trim();
          if (!regex.test(strVal)) {
            const errorKey = `${rowIdx}_${rule.targetCol}`;
            errorMap.set(errorKey, {
              rowIdx,
              colKey: rule.targetCol,
              ruleId: rule.id,
              ruleType: rule.type,
              ruleName: rule.name,
              expectedValue: rule.pattern,
              actualValue: strVal,
              message: rule.errorMessage || `포맷 불일치: '${strVal}' 값은 지정된 규격에 맞지 않습니다.`,
            });
            errorRowIndices.add(rowIdx);
          }
        } catch {}
      }
    });
  });

  // 5. 단일 열 고유값(중복 금지) 검증 (사용자 지정: 주문번호, 송장번호, 이메일, 식별자 등)
  const uniqueRules = activeRules.filter((r) => r.type === 'UNIQUE_COLUMN');
  uniqueRules.forEach((rule) => {
    const col = rule.targetCol;
    if (!col) return;
    const groupMap = new Map<string, number[]>();

    rows.forEach((row, rowIdx) => {
      const raw = row[col];
      if (raw === undefined || raw === null || String(raw).trim() === '') return;
      let key = String(raw);
      if (rule.trimWhitespace !== false) key = key.trim();
      if (!rule.caseSensitive) key = key.toLowerCase();

      const list = groupMap.get(key) || [];
      list.push(rowIdx);
      groupMap.set(key, list);
    });

    groupMap.forEach((indices) => {
      if (indices.length > 1) {
        indices.forEach((idx) => {
          const errorKey = `${idx}_${col}`;
          const otherRows = indices.filter((i) => i !== idx).map((i) => `${i + 1}행`).join(', ');
          const val = String(rows[idx][col] ?? '');
          errorMap.set(errorKey, {
            rowIdx: idx,
            colKey: col,
            ruleId: rule.id,
            ruleType: rule.type,
            ruleName: rule.name,
            expectedValue: '고유값 (중복 없음)',
            actualValue: `${indices.length}회 중복`,
            message: rule.errorMessage || `[고유값 위반] '${col}' 열에 동일한 값('${val}')이 ${indices.length}건 중복되었습니다. (동일 행: ${otherRows})`,
          });
          errorRowIndices.add(idx);
        });
      }
    });
  });

  // 6. 복합 열 조합 중복 검출 (사용자가 직접 선택한 복합 키 또는 기본 회계 전표 조합)
  const compositeRules = activeRules.filter((r) => r.type === 'COMPOSITE_UNIQUE' || r.type === 'DUPLICATE_ENTRY');
  compositeRules.forEach((rule) => {
    // 사용자가 지정한 복합 컬럼 목록 추출
    const cols: string[] = [];
    if (rule.compositeCols && rule.compositeCols.length > 0) {
      cols.push(...rule.compositeCols);
    } else if (rule.operandCols && rule.operandCols.length > 0) {
      cols.push(...rule.operandCols);
      if (rule.targetCol && !cols.includes(rule.targetCol)) {
        cols.push(rule.targetCol);
      }
    } else if (rule.targetCol) {
      cols.push(rule.targetCol);
    }

    if (cols.length === 0) return;

    const groupMap = new Map<string, number[]>();
    rows.forEach((row, rowIdx) => {
      const parts = cols.map((c) => {
        let v = row[c];
        if (v === null || v === undefined) return '';
        let s = String(v);
        if (rule.trimWhitespace !== false) s = s.trim();
        if (!rule.caseSensitive) s = s.toLowerCase();
        return s;
      });

      // 적어도 하나 이상의 키가 채워져 있는 경우에만 검사
      if (parts.some((p) => p !== '')) {
        const key = parts.join(':::');
        const list = groupMap.get(key) || [];
        list.push(rowIdx);
        groupMap.set(key, list);
      }
    });

    const highlightCol = rule.targetCol || cols[0];
    groupMap.forEach((indices) => {
      if (indices.length > 1) {
        indices.forEach((idx) => {
          const errorKey = `${idx}_${highlightCol}`;
          const otherRows = indices.filter((i) => i !== idx).map((i) => `${i + 1}행`).join(', ');
          const colSummary = cols.map((c) => `${c}: ${rows[idx][c] ?? ''}`).join(', ');
          errorMap.set(errorKey, {
            rowIdx: idx,
            colKey: highlightCol,
            ruleId: rule.id,
            ruleType: rule.type,
            ruleName: rule.name,
            expectedValue: '단일 등록 (조합 고유값)',
            actualValue: `${indices.length}회 중복`,
            message: rule.errorMessage || `[중복 데이터 감지] 조합 (${colSummary})이(가) ${indices.length}건 중복 등록되었습니다. (동일 행: ${otherRows})`,
          });
          errorRowIndices.add(idx);
        });
      }
    });
  });

  return {
    hasErrors: errorMap.size > 0,
    totalErrorCount: errorMap.size,
    errorRowsCount: errorRowIndices.size,
    errorRowIndices,
    errorMap,
  };
}

/**
 * 자연어 문장을 분석하여 유효성 검증 규칙 객체로 변환 (클라이언트 지능형 파서)
 */
export function parseNaturalLanguageRule(
  prompt: string,
  headers: string[]
): ValidationRule | null {
  const p = prompt.trim();
  if (!p) return null;

  // 1-A. 사용자 정의 단일 열 고유값 검증 ("주문번호 고유값", "이메일 중복 금지", "사번 유일" 등)
  if (p.includes('고유') || p.includes('유일') || p.includes('단일') || p.includes('중복')) {
    const matchedHeaders = headers.filter((h) => p.includes(h));
    if (matchedHeaders.length === 1) {
      const col = matchedHeaders[0];
      return {
        id: `custom_unique_${Date.now()}`,
        name: `${col} 고유값(중복 금지) 검증`,
        targetCol: col,
        type: 'UNIQUE_COLUMN',
        errorMessage: `'${col}' 열에는 중복된 값이 존재하지 않아야 합니다.`,
        enabled: true,
        naturalPrompt: prompt,
      };
    } else if (matchedHeaders.length >= 2) {
      return {
        id: `custom_comp_dup_${Date.now()}`,
        name: `${matchedHeaders.join(' + ')} 조합 중복 검출`,
        targetCol: matchedHeaders[matchedHeaders.length - 1],
        compositeCols: matchedHeaders,
        type: 'COMPOSITE_UNIQUE',
        errorMessage: `${matchedHeaders.join(', ')} 조합이 일치하는 중복 데이터가 등록되었습니다.`,
        enabled: true,
        naturalPrompt: prompt,
      };
    }
  }

  // 1-C. 실무 기본 회계 전표 중복/이중 등록 패턴: "동일 날짜", "동일 거래처", "중복", "이중"
  if (p.includes('중복') || p.includes('이중') || (p.includes('동일') && (p.includes('금액') || p.includes('거래처')))) {
    const dateCol = headers.find((h) => h.includes('일자') || h.includes('날짜'));
    const partnerCol = headers.find(
      (h) =>
        h.includes('거래처') ||
        h.includes('상호') ||
        h.includes('공급자') ||
        h.includes('고객') ||
        h.includes('업체') ||
        h.includes('회사')
    );
    const amountCol = headers.find((h) => h.includes('합계') || h.includes('금액') || h.includes('공급가액'));

    if (dateCol && partnerCol && amountCol) {
      return {
        id: `custom_dup_${Date.now()}`,
        name: `동일 거래일자 + 거래처 + 금액 이중 전표 검출`,
        targetCol: amountCol,
        type: 'DUPLICATE_ENTRY',
        operandCols: [dateCol, partnerCol],
        errorMessage: `동일한 거래일자(${dateCol})와 거래처(${partnerCol})에 동일한 금액(${amountCol})이 이중 등록되었습니다.`,
        enabled: true,
        naturalPrompt: prompt,
      };
    }
  }

  // 2. 곱셈 패턴: "A는 B 곱하기 C여야 해", "A = B * C"
  if (p.includes('곱') || p.includes('*') || p.includes('x') || p.includes('×')) {
    // 헤더 중 대상 컬럼 찾기
    const foundHeaders = headers.filter((h) => p.includes(h));
    if (foundHeaders.length >= 3) {
      // 통상 맨 앞이나 뒤에 있는 것이 타겟 컬럼
      const target = foundHeaders.find((h) => h.includes('금액') || h.includes('합계')) || foundHeaders[foundHeaders.length - 1];
      const operands = foundHeaders.filter((h) => h !== target).slice(0, 2);
      if (operands.length === 2) {
        return {
          id: `custom_${Date.now()}`,
          name: `${operands[0]} × ${operands[1]} = ${target} 검산`,
          targetCol: target,
          type: 'ARITHMETIC_MULTIPLY',
          operandCols: operands,
          tolerance: 1,
          errorMessage: `${target}은 ${operands[0]} × ${operands[1]} 계산값과 일치해야 합니다.`,
          enabled: true,
          naturalPrompt: prompt,
        };
      }
    }
  }

  // 3. 덧셈 패턴: "A는 B 더하기 C", "A = B + C"
  if (p.includes('더하') || p.includes('+') || p.includes('합한')) {
    const foundHeaders = headers.filter((h) => p.includes(h));
    if (foundHeaders.length >= 3) {
      const target = foundHeaders.find((h) => h.includes('합계') || h.includes('총')) || foundHeaders[foundHeaders.length - 1];
      const operands = foundHeaders.filter((h) => h !== target).slice(0, 2);
      if (operands.length === 2) {
        return {
          id: `custom_${Date.now()}`,
          name: `${operands[0]} + ${operands[1]} = ${target} 검산`,
          targetCol: target,
          type: 'ARITHMETIC_SUM',
          operandCols: operands,
          tolerance: 1,
          errorMessage: `${target}은 ${operands[0]} + ${operands[1]} 합계와 일치해야 합니다.`,
          enabled: true,
          naturalPrompt: prompt,
        };
      }
    }
  }

  // 4. 부가세율/비율 패턴: "10%", "부가세", "세액"
  if (p.includes('10%') || p.includes('부가세') || p.includes('세액') || p.includes('0.1')) {
    const foundHeaders = headers.filter((h) => p.includes(h));
    const target = foundHeaders.find((h) => h.includes('세액') || h.includes('부가세'));
    const base = foundHeaders.find((h) => h.includes('공급') || h.includes('금액'));
    if (target && base && target !== base) {
      return {
        id: `custom_${Date.now()}`,
        name: `${target} = ${base}의 10% 부가세율 검증`,
        targetCol: target,
        type: 'PERCENTAGE',
        operandCols: [base],
        percentage: 0.1,
        tolerance: 2,
        errorMessage: `${target}은 ${base}의 10% 부가세율과 일치해야 합니다.`,
        enabled: true,
        naturalPrompt: prompt,
      };
    }
  }

  // 5. 날짜 패턴
  if (p.includes('날짜') || p.includes('일자') || p.includes('YYYY-MM-DD')) {
    const target = headers.find((h) => p.includes(h)) || headers.find((h) => h.includes('일자') || h.includes('날짜'));
    if (target) {
      return {
        id: `custom_${Date.now()}`,
        name: `${target} YYYY-MM-DD 표준 날짜 규격 검증`,
        targetCol: target,
        type: 'REGEX',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        errorMessage: `${target}은 YYYY-MM-DD 표준 날짜 규격이어야 합니다.`,
        enabled: true,
        naturalPrompt: prompt,
      };
    }
  }

  return null;
}
