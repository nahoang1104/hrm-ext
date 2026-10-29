window.DOC_CSS=`
@page {
  size: A4;
  margin: 16mm 17mm 15mm 17mm;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
}

body {
  font-family: "Times New Roman", Times, serif;
  font-size: 11.5pt;
  line-height: 1.30;
  color: #000;
  background: #eee;
}

.page {
  width: 210mm;
  min-height: 297mm;
  height: 297mm;
  margin: 10mm auto;
  padding: 16mm 17mm 15mm 17mm;
  background: #fff;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  page-break-after: always;
  break-after: page;
}

.page:last-child {
  page-break-after: auto;
  break-after: auto;
}

/* ===== Phần đầu hợp đồng ===== */

.national {
  text-align: center;
  font-weight: bold;
  line-height: 1.25;
  margin-bottom: 8px;
}

.national .sub {
  text-decoration: underline;
}

.title {
  text-align: center;
  font-weight: bold;
  font-size: 15pt;
  margin-top: 6px;
}

.subtitle {
  text-align: center;
  font-weight: bold;
  font-size: 12.5pt;
  margin-top: 2px;
}

.contract-no {
  text-align: center;
  margin-top: 4px;
}

.intro {
  margin-top: 8px;
  text-align: justify;
}

.party {
  margin: 5px 0;
}

.party-title {
  font-weight: bold;
}

.party p {
  margin: 2px 0;
}

.agreement {
  margin-top: 7px;
  text-align: justify;
}

/* ===== Nội dung ===== */

h2 {
  font-size: 12.5pt;
  margin: 7px 0 4px;
  text-align: left;
  break-after: avoid;
  page-break-after: avoid;
}

p {
  margin: 3px 0;
  text-align: justify;
}

.section-title {
  font-weight: bold;
}

/*
 * Giữ nguyên indent mặc định của trình duyệt
 * cho danh sách đánh số giống goc.html.
 */
ol {
  margin-top: 1em;
  margin-bottom: 1em;
  padding-left: 40px;
}

ul {
  margin: 3px 0 4px 23px;
  padding: 0;
}

li {
  margin: 1px 0;
}

/* ===== Bảng ===== */

table {
  width: 100%;
  border-collapse: collapse;
  margin: 5px 0;
}

th,
td {
  border: 1px solid #000;
  padding: 4px 5px;
  vertical-align: middle;
}

th {
  text-align: center;
  font-weight: bold;
}

tr {
  break-inside: avoid;
  page-break-inside: avoid;
}

.center {
  text-align: center;
}

.right {
  text-align: right;
}

.nowrap {
  white-space: nowrap;
}

/* ===== Khoảng cách theo từng trang gốc ===== */

/*
 * Điều 1 trên trang đầu:
 * heading đầu tiên không có khoảng margin-top thêm.
 */
.page:first-child h2:first-of-type {
  margin-top: 0;
}

/*
 * Trang 2 và các trang nội dung tiếp theo:
 * bám cách dàn trang của goc.html.
 */
.page:not(:first-child) {
  justify-content: space-between;
}

.page:not(:first-child) h2 {
  margin-top: 10px;
  margin-bottom: 4px;
}

.page:not(:first-child) p {
  margin-top: 4px;
  margin-bottom: 4px;
}

.page:not(:first-child) > h2:first-child {
  margin-top: 0;
}

/*
 * Các phần tử không được flex tự co lại.
 */
.page > * {
  flex-shrink: 0;
}

/* ===== Chữ ký ===== */

.signature {
  display: flex;
  justify-content: space-between;
  text-align: center;
  margin-top: 24px;
}

.signature-col {
  width: 45%;
}

.signature-title {
  font-weight: bold;
}

.signature-note {
  margin-top: 3px;
}

.signature-space {
  height: 43mm;
}

.signature-name {
  font-weight: bold;
}

.page:last-child .signature {
  margin-top: 12px;
  margin-bottom: 0;
}

/* ===== Vùng tài liệu ===== */

#document {
  width: 100%;
}

#source {
  display: none;
}

/* ===== Hiển thị trên màn hình ===== */

@media screen {
  body {
    background: #eee;
  }

  .page {
    box-shadow: 0 2px 8px rgba(0,0,0,.18);
  }
}

/*
 * QUAN TRỌNG:
 *
 * @page đã tạo vùng giấy A4 và margin:
 *   trái/phải 17mm
 *   trên 16mm
 *   dưới 15mm
 *
 * Vì vậy khi in KHÔNG được đặt lại:
 *   width: 210mm
 *   height: 297mm
 *   padding: 16mm 17mm...
 *
 * Bản gốc cũng dùng:
 *   width: auto
 *   height: 266mm
 *   padding: 0
 *
 * để nội dung nằm đúng trong vùng A4 do @page tạo ra.
 */
@media print {
  html,
  body {
    width: auto;
    height: auto;
    margin: 0;
    padding: 0;
    background: #fff;
  }

  .page {
    width: auto;
    min-width: 0;
    min-height: 0;

    /*
     * 297mm - 16mm - 15mm = 266mm
     */
    height: 266mm;

    margin: 0;
    padding: 0;

    background: #fff;
    box-shadow: none;

    overflow: visible;

    display: flex;
    flex-direction: column;

    page-break-after: always;
    break-after: page;
  }

  .page:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  /*
   * Không để trình duyệt tự shrink toàn bộ trang.
   */
  body {
    zoom: 1;
  }
}
`;