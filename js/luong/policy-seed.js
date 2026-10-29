/* Seed §6; các giá trị chưa xác minh để trống, SUPER_ADMIN cần rà soát trước khi tính lương thật. */
(function(g){
 const common={minimumWageI:5310000,minimumWageII:4730000,minimumWageIII:4140000,minimumWageIV:3700000,minimumWageHourI:25500,minimumWageHourII:22700,minimumWageHourIII:20000,minimumWageHourIV:17800};
 g.POLICY_SEED=[
  {...common,id:'2026-01-01',effectiveFrom:'2026-01-01',effectiveTo:'2026-06-30',baseSalary:2340000,insuranceCap:46800000,source:'NĐ 293/2025/NĐ-CP; NĐ 161/2026/NĐ-CP'},
  {...common,id:'2026-07-01',effectiveFrom:'2026-07-01',effectiveTo:'9999-12-31',baseSalary:2530000,insuranceCap:50600000,source:'NĐ 293/2025/NĐ-CP; NĐ 161/2026/NĐ-CP'}
 ];
})(window);
