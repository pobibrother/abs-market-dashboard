// Observed public display, 2026-11-09 20:17 KST. Amounts are in 억원,
// rates are percentages, and change/annual are basis points.
export const source = 'https://abs.namepf.com/';
export const collectedAt = '2026-11-09T20:17:00+09:00';
const date = '2026-11-09';

function nice(id) {
  return { label: 'NICE', url: 'https://www.nicerating.com/common/fileDown.do?docId=' + id };
}
function kis(file, name, day) {
  const url = new URL('https://www.kisrating.com/fileDown.do');
  url.search = new URLSearchParams({menuCd: 'R8', gubun: '2', fileName: file, fileTitle: name, writedate: day});
  return { label: '한신평', url: url.href };
}
function kr(encodedFile, sequence, code, name) {
  const url = new URL('https://www.korearatings.com/ajaxa/fileCpnt/reportFileDown.do');
  url.search = new URLSearchParams({encFileNm: encodedFile, encSvcSeqNo: sequence, evalNo: '1', rptNo: '03', fileName: '', compCd: code, compNm: name});
  return { label: '한기평', url: url.href };
}
const pride = nice('2ed629b7-cc6e-4fe6-a9c5-db1ac877f61b');
const jys = [nice('af4e6bb6-117b-4098-b8b6-f1475d1b0ba0'), kis('rs20261106-19.pdf', '제이와이에스제오차', '20261106')];
const creditSupport = '사모사채 인수확약·매입확약·자금보충';
const hyundai = '현대건설 · 사모사채 인수확약·자금보충·채무인수';
const cards = '에스케이에너지 · 카드대금 참가 / 신한카드 · 카드대금 참가';

export const rows = [
  {name:'프라임클로버', issue:'1-1회', support:'교보증권 · ' + creditSupport, grade:'A1', rate:null, amount:200, date, maturity:'2026-11-16', pf:'일반', kind:'ABSTB', manager:'교보증권', reports:[nice('329c50d6-a6f0-4ade-a22e-0d83cd7c9471')]},
  {name:'프라이든제오차', issue:'29-3회', support:cards, grade:'A1', rate:4.03, amount:3639, date, maturity:'2027-01-05', pf:'일반', kind:'ABSTB', manager:'에스케이증권', reports:[pride]},
  {name:'프라이든제오차', issue:'29-2회', support:cards, grade:'A1', rate:4.03, amount:295, date, maturity:'2027-01-08', pf:'일반', kind:'ABSTB', manager:'에스케이증권', reports:[pride, kr('dps07AzDLP5@KUF1CY@PN290g8LCuj2p7ie.oleKnkA=', 'i4q9k5ryLIc.lBW9Qifc.Q==', '222570', '프라이든제오차(주)')]},
  {name:'포르투나제십이차', issue:'1회', support:'국민은행 · 정기예금', grade:'A1', rate:4.07, amount:2450, date, maturity:'2027-09-10', pf:'일반', kind:'ABCP', manager:'부국증권', reports:[nice('78edc249-409e-4dd7-9bbf-6005f05cded3'), kis('rs20261109-5.pdf','포르투나제십이차','20261109')]},
  {name:'키스비케이제십사차', issue:'1회', support:'현대카드 · 카드대금 참가', grade:'A1', rate:4.05, amount:267.4, date, maturity:'2027-01-08', pf:'일반', kind:'ABSTB', manager:'한국투자증권', reports:[kr('JZGJd72D2g9fh7bdmGvlxMraAssUJ458O17TQTJRtmE=', '2WqcgnMQXdgndNjVMwx9iw==', '240543', '키스비케이제십사차(주)'), kis('rs20261106-15.pdf','키스비케이제십사차','20261106')]},
  {name:'케이더블유엠에스', issue:'7회', support:'키움증권 · ' + creditSupport, grade:'A1', rate:null, amount:155, date, maturity:'2027-02-10', pf:'일반', kind:'ABSTB', manager:'키움증권', reports:[nice('26e7956c-dbc3-4aad-b641-2d3da650e75e')]},
  {name:'제일사랑제11차', issue:'2-2회', support:'한국스탠다드차타드은행 · 정기예금', grade:'A1', rate:4.07, amount:1200, date, maturity:'2027-08-05', pf:'일반', kind:'ABCP', manager:'부국증권', reports:[kr('Yvd4tGHh.WmYlqHFJK9@JBraSbAqX72dva5KqwCM7k0=', 'Zt7eJVahYrCMLTopuLLEtQ==', '227517', '제일사랑제11차(주)'), kis('rs20261109-11.pdf','제일사랑제11차','20261109')]},
  {name:'제이와이에스제오차', issue:'3-2회차', support:hyundai, grade:'A1', rate:5.00, amount:3.8, date, maturity:'2027-05-31', pf:'PF', kind:'ABCP', manager:'아이엠증권', reports:jys},
  {name:'제이와이에스제오차', issue:'3-1회차', support:hyundai, grade:'A1', rate:4.20, amount:2500, date, maturity:'2027-02-02', pf:'PF', kind:'ABSTB', manager:'아이엠증권', reports:jys},
  {name:'제이와이씨제십차', issue:'1-2회', support:hyundai, grade:'A1', rate:5.00, amount:0.6, date, maturity:'2027-05-10', pf:'PF', kind:'ABCP', manager:'한국투자증권', reports:[nice('18e0fcd5-b356-4123-a540-b6dcaf62cf54'), kis('rs20261109-4.pdf','제이와이씨제십차','20261109')]}
];

export const rates = [
  {name:'CP 91일', detail:'A1 기준', value:3.87, change:0, annual:107.0},
  {name:'CD 91일', detail:'AAA 은행', value:3.36, change:2.0, annual:76.0},
  {name:'국고채 3년', detail:'지표물', value:3.639, change:2.6, annual:77.4},
  {name:'회사채 3년', detail:'무보증 AA-', value:4.332, change:1.9, annual:107.1}
].map(rate => ({...rate, series:[[date, rate.value]]}));
