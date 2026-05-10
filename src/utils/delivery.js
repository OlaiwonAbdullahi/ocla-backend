function getEstimatedDelivery(businessDays) {
  const date = new Date();
  let added = 0;
  while (added < businessDays) {
    date.setDate(date.getDate() + 1);
    const dow = date.getDay();
    if (dow !== 0 && dow !== 6) added++; // skip weekends
  }
  return date;
}

module.exports = { getEstimatedDelivery };
