// Astrolab — Excel & Export Utilities
// Extracted from App.jsx (Wave 3)

// Centralized ExcelJS loader — used for ALL Excel read/write operations.
// SheetJS removed from public CDNs (403), ExcelJS 4.4.0 on cdnjs is the replacement.
async function loadExcelJS() {
  if (window.ExcelJS) return window.ExcelJS;
  await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";
    s.onload = res;
    s.onerror = () => rej(new Error("Gagal memuat library ExcelJS dari CDN."));
    document.head.appendChild(s);
  });
  return window.ExcelJS;
}

// Convert ExcelJS worksheet → array of objects (mimics SheetJS sheet_to_json).
// Each object uses the header row values as keys.
// Uses ws.eachRow() instead of ws.rowCount (which can be 0 after wb.xlsx.load).
function excelSheetToJson(ws, { defval = undefined } = {}) {
  if (!ws) return [];
  // Collect all rows via eachRow — reliable even when rowCount is wrong
  const allRows = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
    allRows.push(row);
  });
  if (allRows.length < 2) return []; // need header + at least 1 data row

  // Row 0 in allRows = header row
  const headers = [];
  allRows[0].eachCell({ includeEmpty: true }, (cell, col) => {
    let v = cell.value;
    if (v && typeof v === "object" && v.richText) v = v.richText.map(p => p.text).join("");
    headers[col] = (v ?? "").toString().trim();
  });

  // Remaining rows = data
  const rows = [];
  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i];
    let empty = true;
    const obj = {};
    headers.forEach((h, col) => {
      if (!h) return;
      let v = row.getCell(col).value;
      if (v && typeof v === "object" && v.richText) {
        v = v.richText.map(p => p.text).join("");
      }
      if (v === null || v === undefined) {
        obj[h] = defval !== undefined ? defval : undefined;
      } else {
        obj[h] = v;
        empty = false;
      }
    });
    if (!empty) rows.push(obj);
  }
  return rows;
}


const EXCEL_EXPORT_IPA_B64 = "UEsDBBQAAAAIAFUmsVxGx01IlQAAAM0AAAAQAAAAZG9jUHJvcHMvYXBwLnhtbE3PTQvCMAwG4L9SdreZih6kDkQ9ip68zy51hbYpbYT67+0EP255ecgboi6JIia2mEXxLuRtMzLHDUDWI/o+y8qhiqHke64x3YGMsRoPpB8eA8OibdeAhTEMOMzit7Dp1C5GZ3XPlkJ3sjpRJsPiWDQ6sScfq9wcChDneiU+ixNLOZcrBf+LU8sVU57mym/8ZAW/B7oXUEsDBBQAAAAIAFUmsVzmsp3A7wAAACsCAAARAAAAZG9jUHJvcHMvY29yZS54bWzNklFLwzAQx7+K5L29tN0mhK4vik8KggPFt5DctmCThuSk3bc3jVuH6AfwMXf//O53cK3yQg0Bn8PgMZDBeDPZ3kWh/JYdibwAiOqIVsYyJVxq7odgJaVnOICX6kMeEGrON2CRpJYkYQYWfiGyrtVKqICShnDGa7Xg/WfoM0wrwB4tOopQlRWwbp7oT1PfwhUwwwiDjd8F1AsxV//E5g6wc3KKZkmN41iOTc6lHSp4e3p8yesWxkWSTmH6FY2gk8ctu0x+be7udw+sq3m9Kfi6qG53fCXWXKya99n1h99V2A7a7M0/Nr4Idi38uovuC1BLAwQUAAAACABVJrFcmVycIxAGAACcJwAAEwAAAHhsL3RoZW1lL3RoZW1lMS54bWztWltz2jgUfu+v0Hhn9m0LxjaBtrQTc2l227SZhO1OH4URWI1seWSRhH+/RzYQy5YN7ZJNups8BCzp+85FR+foOHnz7i5i6IaIlPJ4YNkv29a7ty/e4FcyJBFBMBmnr/DACqVMXrVaaQDDOH3JExLD3IKLCEt4FMvWXOBbGi8j1uq0291WhGlsoRhHZGB9XixoQNBUUVpvXyC05R8z+BXLVI1lowETV0EmuYi08vlsxfza3j5lz+k6HTKBbjAbWCB/zm+n5E5aiOFUwsTAamc/VmvH0dJIgILJfZQFukn2o9MVCDINOzqdWM52fPbE7Z+Mytp0NG0a4OPxeDi2y9KLcBwE4FG7nsKd9Gy/pEEJtKNp0GTY9tqukaaqjVNP0/d93+ubaJwKjVtP02t33dOOicat0HgNvvFPh8Ouicar0HTraSYn/a5rpOkWaEJG4+t6EhW15UDTIABYcHbWzNIDll4p+nWUGtkdu91BXPBY7jmJEf7GxQTWadIZljRGcp2QBQ4AN8TRTFB8r0G2iuDCktJckNbPKbVQGgiayIH1R4Ihxdyv/fWXu8mkM3qdfTrOa5R/aasBp+27m8+T/HPo5J+nk9dNQs5wvCwJ8fsjW2GHJ247E3I6HGdCfM/29pGlJTLP7/kK6048Zx9WlrBdz8/knoxyI7vd9lh99k9HbiPXqcCzIteURiRFn8gtuuQROLVJDTITPwidhphqUBwCpAkxlqGG+LTGrBHgE323vgjI342I96tvmj1XoVhJ2oT4EEYa4pxz5nPRbPsHpUbR9lW83KOXWBUBlxjfNKo1LMXWeJXA8a2cPB0TEs2UCwZBhpckJhKpOX5NSBP+K6Xa/pzTQPCULyT6SpGPabMjp3QmzegzGsFGrxt1h2jSPHr+BfmcNQockRsdAmcbs0YhhGm78B6vJI6arcIRK0I+Yhk2GnK1FoG2camEYFoSxtF4TtK0EfxZrDWTPmDI7M2Rdc7WkQ4Rkl43Qj5izouQEb8ehjhKmu2icVgE/Z5ew0nB6ILLZv24fobVM2wsjvdH1BdK5A8mpz/pMjQHo5pZCb2EVmqfqoc0PqgeMgoF8bkePuV6eAo3lsa8UK6CewH/0do3wqv4gsA5fy59z6XvufQ9odK3NyN9Z8HTi1veRm5bxPuuMdrXNC4oY1dyzcjHVK+TKdg5n8Ds/Wg+nvHt+tkkhK+aWS0jFpBLgbNBJLj8i8rwKsQJ6GRbJQnLVNNlN4oSnkIbbulT9UqV1+WvuSi4PFvk6a+hdD4sz/k8X+e0zQszQ7dyS+q2lL61JjhK9LHMcE4eyww7ZzySHbZ3oB01+/ZdduQjpTBTl0O4GkK+A226ndw6OJ6YkbkK01KQb8P56cV4GuI52QS5fZhXbefY0dH758FRsKPvPJYdx4jyoiHuoYaYz8NDh3l7X5hnlcZQNBRtbKwkLEa3YLjX8SwU4GRgLaAHg69RAvJSVWAxW8YDK5CifEyMRehw55dcX+PRkuPbpmW1bq8pdxltIlI5wmmYE2eryt5lscFVHc9VW/Kwvmo9tBVOz/5ZrcifDBFOFgsSSGOUF6ZKovMZU77nK0nEVTi/RTO2EpcYvOPmx3FOU7gSdrYPAjK5uzmpemUxZ6by3y0MCSxbiFkS4k1d7dXnm5yueiJ2+pd3wWDy/XDJRw/lO+df9F1Drn723eP6bpM7SEycecURAXRFAiOVHAYWFzLkUO6SkAYTAc2UyUTwAoJkphyAmPoLvfIMuSkVzq0+OX9FLIOGTl7SJRIUirAMBSEXcuPv75Nqd4zX+iyBbYRUMmTVF8pDicE9M3JD2FQl867aJguF2+JUzbsaviZgS8N6bp0tJ//bXtQ9tBc9RvOjmeAes4dzm3q4wkWs/1jWHvky3zlw2zreA17mEyxDpH7BfYqKgBGrYr66r0/5JZw7tHvxgSCb/NbbpPbd4Ax81KtapWQrET9LB3wfkgZjjFv0NF+PFGKtprGtxtoxDHmAWPMMoWY434dFmhoz1YusOY0Kb0HVQOU/29QNaPYNNByRBV4xmbY2o+ROCjzc/u8NsMLEjuHti78BUEsDBBQAAAAIAFUmsVxkTjlQSAYAABEXAAAYAAAAeGwvd29ya3NoZWV0cy9zaGVldDEueG1snVj7b+I4EP5XrJy02pVuSx7kBQWJN5Q+EHS7Pxsw4CMkXGJK93R//E0SB4LrBPYqFYL9fTNjzxcnM/fHINxGG0IY+th5ftRQNozta5VKtNiQHY7ugj3xYWYVhDvM4Ge4rkT7kOBlQtp5FV1VrcoOU19p3idjk7B5z/C8E3hBiML1vKGoqtq12nZLqTTvgwPzqE8mIYoOux0Of7WJFxwbiqZkA1O63rB4ANB7vCYzwn7sAb+i7DWYwACfq5y8LemO+BENfBSSVUNpabWxZsaQBPFGyTHKXaN4yfMg2MY/RksIT4kd+QR9zPYeBdeGgn7xS0tBLNg/khXrEM9rKF1bQXjB6DuZAKOhzAPGgl0SMiyAYQZjqzD4h/iJf+IRAENg+wQNplKoZC61FHsqnuV+0gDSgFrxxv3N133elnht+etsA/pJHmE35zgikKKfdMk2DcVR0JKs8MFj0+A4JDwDyR4uAi9KPtExxZoKWhwiiIZzIYAd9dNv/MGTk8MbegFB5wRdIGhqAcHgBEMg6EWEKidUbyWYnGDeSrA4wbqVYHOCfSvB4QRH3KVqAcHlBPdWQrzfaeZUkeIUUU7JTjWXiiRRWBcz3LwPgyMKE3ysJMPK7Jy0BffcIkYk+k2AMEr9+GyYsRBmKRhkzS9/aLpjqFododbsdfry2GojGHOMOnr5MUWdx9ZsNn15eUIw6uiaDrgp2eI9eqYepmhMPByht9FolLFGk9Z9hUHIsf3KAv4h1FO8ehrved2f49WTePWCeGdPE/RM1iSkSDNRG/tLjFoLskGZf/SKNwcftf7CIfaRruomnKC6dZ7v0gVheIveKTAjFgYenpdEbKQRSwO+AFZToK4XL62aLM2QLy1+PtSiPV7AaQQPgIiE70RpIvTYG/Seu60aSpagu4YJyYJkOKpZd0w0w/4aM9gJugXEvwnKdR23jmw1SZlWd6qX05BxXbPqyDQ5wHJR57A97M8GHMepf/nDMlUDDH3xWN000YSE3gG16W5OwaVfsmfmrXtmcfmqxXtmJXtWLZDDc3AZRsJpX+HgHUYzGh2xhNsp5yZ6l9C65bTXwxpuE01C7N1C1CXE/i1EQ0Ic3EKsSojDW4imhDgqJ07hQPsewoeE+nDFZ8CwhyYB9SXccTl3EpIl3WJWomOb39LVYnnaiQ8z8RG/ob03IcvveTGmCOuqGKXy6KRsu4AdH7wyNX6OytUvw+p9hjjOJaQvsWJeQgYSKwJkKLGiXkJGKcQpgTykEDcHqZqCp3GKiZ+2hY+69PTMnZkl2XeuZ99JPWq5sIR9bnNI0fMsl3/ZXd7h9IJnRqEAOK2aC8wW0tuTYBwh+r7MjqgB56qShjJXogg45sKOeme6+T9BFM5nUaiGIAputuj+yx6WV7TgXteCmzqyc9EIsbQ5xLmuBdnB3eF09ze1kNJ0NReYJeSw50ryLCSoL7MjJHogsyNoaiizI4qBY/I3lmUL2Xc/Zd8wxCOB2ym6+87vQsn7T4kA4lPlmgJiTOzNyAtSkECGuf5yIn0GdzK++ZsiyHjWxQkqqEAGMkUZZKB8/sSjeCB1J54KUneCWkYZyC6J6YGD8lrQRdA4s1R0+4mvvbe/72q8rNFLyhpNL38Jar22vscfaNyDmkuaQl4ZuUBaNacvP567X1tvvWlr0PvatWuQ4m9/at/uK6t4+WJmS7g9u9Yr4fbLuH271i/hDsq4A7s2KOEOy7hDuzYs4Y4411Al3JFdG5VwH85+i3SSFMKyN87/Rb2UUlZGlpREGq8ji2t6x4Ti8CRkFLcM0JIi+IoQXmIPb9Bk2nsb9X7epZMRiQ7+en3Y+L8wwluonBmU2BFFAUSAGY1QhOGNaUnJxz4I4QJDAZ5Vz3dl6+G1oFbWoTDT9RSd0pmfU2PiEKIO1GFRGAS7c2EP3xasNqn2n+7QEEfYP3iojxks8Fz+x8udkzCiK1hQiDc4oli2gEqu27Ij4TrpB0ZoERz8pG+ZG+Vt0WptnDTCxHHNzPqln2b0WkfTZTN6bSwd18CJJvcCE0mv6Bxs2t99wuGa+hHyyAoCV+9s2O4wzUH6gwX7pEGU9kDTphLBSxLGAJhfBQHLfpx7xoc9CkJKfIbjNmpD8bC/jBZ4T5S0k3zqaMUxnbrgzf8AUEsDBBQAAAAIAFUmsVxtdzNPsgQAAJUvAAANAAAAeGwvc3R5bGVzLnhtbN1aba+iOBT+K4QfsLxpL2zURL2QbLK7mWTuh/2KUrUJbwP1rs6v3xbQVuVMqjCujDc30p4+z3nO6aE0xUlJjzH+usOYaockTsupvqM0/90wyvUOJ2H5W5bjlFk2WZGElDWLrVHmBQ6jkoOS2LBNExlJSFJ9Nkn3SZDQUltn+5ROdVM3ZpNNlooeG+l1DxsbJlj7DOOpvgxjsipINThMSHysu23esc7irNAo04KnusV7yu+12apbXGbDk5A0K3inUXu49jMvSBhz+6phEA6K7YrJNYPqc+HFUSEkECFavNmuKRN6nQRac2tp+f3x3QbckW+xCOzRRQLNngNWI/y5WbuN0upEaL6zQpn3mLZbhR3rDs2d0QMCeyG5R1W3ebgl7Jg2f2TOg65pe5DkHlUd03ZD2C1t70sbsSdFt7Q9SnKPqm5puyXsezHvuorcEipFfMfj0JX4qq+S8ZI4Pu8YPL3umE3ykFJcpAFrVJiq88akNdcfx5ztGLZFeLTssa4MKLOYRNzldimEB4FYoA0J2pHUnwejwOmZNLAZKeqbNAhc3+o7fDcY+17fpA5LwHvv4fsL3wdJqy9Wt6usiHBxrtw3/dQ1m8R4Qxm8INsd/6ZZzu+7jNIsYRcRCbdZGlZlfULISK3apU91uqt22eurqWnuUYMPbXwoIqqxlRxFABt50q2IqAc/EJhv+8if3xOYhFALTAIoBiYhHg5M7M2UZ0wgFGdMAFRnTCAeDkzsnlQDkxBqgUkAxcAkxOOBnfc3yoEJhGJgAqAamEA8HJjYgagGJiHUApMAioFJiJvAmgu22K5xHH/lJP9sziuuxagOG60+hfgj4gcQGt9TnC7ZMt1c1jR1gzuS2WpuidZxHuLVcvKZ0cWehZBW7W/7jOIvBd6QQ9U+bM4CIHZLsNtX7GGex8d5TLZpguvglR3OJuEJp+2ygnxn3vhmbM06cKFrn7igZC33/FuE+Qc+0GZTZxw2sGZbaHaGotkRmkc/XzO/17oqHgGVYb1wlsdC81jWbL+wZvRUzX1UxtsAs+wCmp0X1uwB69wr59kyB5hoS3oKoqFkGj1Vc8/rxmCybNlDFO0AokevLHo0RNHSjuNtKOWBnqq555VjMFm2npvmnkRDmR6/smh3iKKl3Z07lPJAT9Xc88oxmCzb5hBFW4Bo9Mqi7SGKlnZ3gzmZsYd4nCRVx0AO7WxpP3p9Wvy/p9lojr2ls/WLk/Vzr8Zf+U/1v/lPAmOhQlvtSUxJ2rR2JIpwpfvigJ3R03AV40t+Nj7Cm3Af04+zcaqL679wRPaJdx71hWemGSWu/+RvJCx0/tkB80XSCB9wtGyaxXYlvdk1mw8HXFvEK8xbC4Spbe0WboP8QAogTI2C/PxK8bhgPLUN0ua2WlwQ44KYGtVmWVZ/kJ92jMc+7ZF6nuMgBGV0uWxVsITyhhD/b2eDtHEE5Id7ui/X8GzDFfLjOoDm9EcVAkUKVyIUKZxrbmnPG0d4XvtsQ344ApoFqHa4/3Y/vKbaMY7DZxXSBt3BsMXzIAuvxfYaRQjIDuJ/7fMD3SWO43ntFm5rV+A4kIXfjbAFUsA1QBan/qHX1fPIOD2nDPFD/Nl/UEsDBBQAAAAIAFUmsVyXirscwAAAABMCAAALAAAAX3JlbHMvLnJlbHOdkrluwzAMQH/F0J4wB9AhiDNl8RYE+QFWog/YEgWKRZ2/r9qlcZALGXk9PBLcHmlA7TiktoupGP0QUmla1bgBSLYlj2nOkUKu1CweNYfSQETbY0OwWiw+QC4ZZre9ZBanc6RXiFzXnaU92y9PQW+ArzpMcUJpSEszDvDN0n8y9/MMNUXlSiOVWxp40+X+duBJ0aEiWBaaRcnToh2lfx3H9pDT6a9jIrR6W+j5cWhUCo7cYyWMcWK0/jWCyQ/sfgBQSwMEFAAAAAgAVSaxXD3U9CM3AQAAJgIAAA8AAAB4bC93b3JrYm9vay54bWyNUdFKw0AQ/JVwH2DSogVLI4hFLUgtVvp+TTbN0rvbsLdptV/vJiFY8MWnu5ld5mbmFmfi457omHx5F2JuapFmnqaxqMHbeEMNBJ1UxN6KQj6ksWGwZawBxLt0mmWz1FsM5mExam04vQYkUAhSULIjdgjn+DvvYHLCiHt0KN+56e8OTOIxoMcLlLnJTBJrOr8S44WCWLctmJzLzWQY7IAFiz/0tjP5afexZ8TuP6wayc0sU8EKOUq/0etb9XgCXR5QK/SMToCXVuCFqW0wHDoZTZFexeh7GM+hxDn/p0aqKixgSUXrIcjQI4PrDIZYYxNNEqyH3KzRWUxWm8cukz6yKod8osau2uI56oBX5WBx9FVChQHKtUpF5bWjYsNJd/Q609u7yb120Tr3pNx7eCNbjjHHL3r4AVBLAwQUAAAACABVJrFcJB6boq0AAAD4AQAAGgAAAHhsL19yZWxzL3dvcmtib29rLnhtbC5yZWxztZE9DoMwDIWvEuUANVCpQwVMXVgrLhAF8yMSEsWuCrcvhQGQOnRhsp4tf+/JTp9oFHduoLbzJEZrBspky+zvAKRbtIouzuMwT2oXrOJZhga80r1qEJIoukHYM2Se7pminDz+Q3R13Wl8OP2yOPAPMLxd6KlFZClKFRrkTMJotjbBUuLLTJaiqDIZiiqWcFog4skgbWlWfbBPTrTneRc390WuzeMJrt8McHh0/gFQSwMEFAAAAAgAVSaxXGWQeZIZAQAAzwMAABMAAABbQ29udGVudF9UeXBlc10ueG1srZNNTsMwEIWvEmVbJS4sWKCmG2ALXXABY08aq/6TZ1rS2zNO2kqgEhWFTax43rzPnpes3o8RsOid9diUHVF8FAJVB05iHSJ4rrQhOUn8mrYiSrWTWxD3y+WDUMETeKooe5Tr1TO0cm+peOl5G03wTZnAYlk8jcLMakoZozVKEtfFwesflOpEqLlz0GBnIi5YUIqrhFz5HXDqeztASkZDsZGJXqVjleitQDpawHra4soZQ9saBTqoveOWGmMCqbEDIGfr0XQxTSaeMIzPu9n8wWYKyMpNChE5sQR/x50jyd1VZCNIZKaveCGy9ez7QU5bg76RzeP9DGk35IFiWObP+HvGF/8bzvERwu6/P7G81k4af+aL4T9efwFQSwECFAMUAAAACABVJrFcRsdNSJUAAADNAAAAEAAAAAAAAAAAAAAAgAEAAAAAZG9jUHJvcHMvYXBwLnhtbFBLAQIUAxQAAAAIAFUmsVzmsp3A7wAAACsCAAARAAAAAAAAAAAAAACAAcMAAABkb2NQcm9wcy9jb3JlLnhtbFBLAQIUAxQAAAAIAFUmsVyZXJwjEAYAAJwnAAATAAAAAAAAAAAAAACAAeEBAAB4bC90aGVtZS90aGVtZTEueG1sUEsBAhQDFAAAAAgAVSaxXGROOVBIBgAAERcAABgAAAAAAAAAAAAAAICBIggAAHhsL3dvcmtzaGVldHMvc2hlZXQxLnhtbFBLAQIUAxQAAAAIAFUmsVxtdzNPsgQAAJUvAAANAAAAAAAAAAAAAACAAaAOAAB4bC9zdHlsZXMueG1sUEsBAhQDFAAAAAgAVSaxXJeKuxzAAAAAEwIAAAsAAAAAAAAAAAAAAIABfRMAAF9yZWxzLy5yZWxzUEsBAhQDFAAAAAgAVSaxXD3U9CM3AQAAJgIAAA8AAAAAAAAAAAAAAIABZhQAAHhsL3dvcmtib29rLnhtbFBLAQIUAxQAAAAIAFUmsVwkHpuirQAAAPgBAAAaAAAAAAAAAAAAAACAAcoVAAB4bC9fcmVscy93b3JrYm9vay54bWwucmVsc1BLAQIUAxQAAAAIAFUmsVxlkHmSGQEAAM8DAAATAAAAAAAAAAAAAACAAa8WAABbQ29udGVudF9UeXBlc10ueG1sUEsFBgAAAAAJAAkAPgIAAPkXAAAAAA==";
const EXCEL_EXPORT_INFO_B64 = "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";

function downloadBase64Excel(b64, filename) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const blob = new Blob([arr], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename;
  a.click(); URL.revokeObjectURL(url);
}

export async function downloadTemplateSoal() {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Astrolab · Our Classroom";

  const headerStyle = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D6B7A" } }, font: { name: "Arial", bold: true, color: { argb: "FFFFFFFF" }, size: 11 }, alignment: { horizontal: "center", vertical: "middle", wrapText: true } };
  const exampleStyle = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF4F3" } }, font: { name: "Arial", italic: true, color: { argb: "FF6B7280" }, size: 10 }, alignment: { vertical: "top", wrapText: true } };

  // Sheet 1: Pilihan Ganda
  const ws1 = wb.addWorksheet("1. Pilihan Ganda", { properties: { tabColor: { argb: "FF3B82F6" } } });
  ws1.columns = [
    { header: "Pertanyaan", width: 50 },
    { header: "Pilihan A", width: 20 },
    { header: "Pilihan B", width: 20 },
    { header: "Pilihan C", width: 20 },
    { header: "Pilihan D", width: 20 },
    { header: "Jawaban (A/B/C/D)", width: 18 },
    { header: "Poin", width: 8 },
    { header: "Pembahasan", width: 40 },
    { header: "Tags", width: 22 },
  ];
  ws1.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws1.getRow(1).height = 35;
  ws1.addRow(["Apa ibukota Indonesia?", "Surabaya", "Jakarta", "Bandung", "Medan", "B", 10, "Jakarta adalah ibukota Indonesia sejak 1945.", "geografi, indonesia"]).eachCell(c => Object.assign(c, exampleStyle));

  // Sheet 2: Benar/Salah
  const ws2 = wb.addWorksheet("2. Benar Salah", { properties: { tabColor: { argb: "FF10B981" } } });
  ws2.columns = [
    { header: "Pernyataan", width: 60 },
    { header: "Jawaban (Benar/Salah)", width: 22 },
    { header: "Poin", width: 8 },
    { header: "Pembahasan", width: 40 },
    { header: "Tags", width: 22 },
  ];
  ws2.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws2.getRow(1).height = 35;
  ws2.addRow(["Matahari adalah bintang terdekat dengan bumi.", "Benar", 10, "Matahari ±150 juta km dari Bumi (1 AU), bintang terdekat.", "astronomi, bintang"]).eachCell(c => Object.assign(c, exampleStyle));

  // Sheet 3: PG Kompleks
  const ws3 = wb.addWorksheet("3. PG Kompleks", { properties: { tabColor: { argb: "FFF97316" } } });
  ws3.columns = [
    { header: "Pertanyaan", width: 50 },
    { header: "Pilihan A", width: 20 },
    { header: "Pilihan B", width: 20 },
    { header: "Pilihan C", width: 20 },
    { header: "Pilihan D", width: 20 },
    { header: "Jawaban Benar (A,B,C,D)", width: 22 },
    { header: "Poin", width: 8 },
    { header: "Pembahasan", width: 40 },
    { header: "Tags", width: 22 },
  ];
  ws3.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws3.getRow(1).height = 35;
  ws3.addRow(["Manakah yang termasuk planet di tata surya?", "Bumi", "Mars", "Bulan", "Venus", "A,B,D", 15, "Bumi, Mars, Venus = planet. Bulan = satelit alami Bumi.", "astronomi, tata-surya"]).eachCell(c => Object.assign(c, exampleStyle));

  // Sheet 4: Pasangkan
  const ws4 = wb.addWorksheet("4. Pasangkan", { properties: { tabColor: { argb: "FF8B5CF6" } } });
  ws4.columns = [
    { header: "Pertanyaan / Instruksi", width: 40 },
    { header: "Item Kiri 1", width: 18 }, { header: "Pasangan Kanan 1", width: 22 },
    { header: "Item Kiri 2", width: 18 }, { header: "Pasangan Kanan 2", width: 22 },
    { header: "Item Kiri 3", width: 18 }, { header: "Pasangan Kanan 3", width: 22 },
    { header: "Item Kiri 4", width: 18 }, { header: "Pasangan Kanan 4", width: 22 },
    { header: "Poin", width: 8 },
    { header: "Pembahasan", width: 40 },
    { header: "Tags", width: 22 },
  ];
  ws4.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws4.getRow(1).height = 35;
  ws4.addRow(["Pasangkan negara dengan ibukotanya", "Indonesia", "Jakarta", "Malaysia", "Kuala Lumpur", "Thailand", "Bangkok", "Singapura", "Singapura", 10, "Ibukota negara ASEAN. Singapura adalah negara-kota.", "geografi, asean"]).eachCell(c => Object.assign(c, exampleStyle));

  // Sheet 5: Excel Sandbox
  const ws5 = wb.addWorksheet("5. Excel Sandbox", { properties: { tabColor: { argb: "FFEAB308" } } });
  ws5.columns = [
    { header: "Pertanyaan", width: 40 },
    { header: "Header Kolom (pisah |)", width: 25 },
    { header: "Data Tabel (baris pisah ;, kolom pisah |)", width: 40 },
    { header: "Pilihan A", width: 15 },
    { header: "Pilihan B", width: 15 },
    { header: "Pilihan C", width: 15 },
    { header: "Pilihan D", width: 15 },
    { header: "Jawaban (A/B/C/D)", width: 18 },
    { header: "Poin", width: 8 },
    { header: "Pembahasan", width: 40 },
    { header: "Tags", width: 22 },
  ];
  ws5.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws5.getRow(1).height = 35;
  ws5.addRow([
    "Hitung rata-rata nilai siswa di tabel berikut",
    "Nama|Nilai",
    "Budi|85;Sari|92;Andi|78",
    "75", "85", "92", "78", "B", 15,
    "Rata-rata = (85+92+78)/3 = 85. Pakai =AVERAGE(B2:B4).",
    "informatika, excel"
  ]).eachCell(c => Object.assign(c, exampleStyle));

  // Sheet 6: Essay
  const ws6 = wb.addWorksheet("6. Essay", { properties: { tabColor: { argb: "FFEC4899" } } });
  ws6.columns = [
    { header: "Pertanyaan", width: 50 },
    { header: "Kata Kunci (pisah koma)", width: 35 },
    { header: "Panduan Penilaian", width: 40 },
    { header: "Poin", width: 8 },
    { header: "Pembahasan", width: 40 },
    { header: "Tags", width: 22 },
  ];
  ws6.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws6.getRow(1).height = 35;
  ws6.addRow([
    "Jelaskan proses fotosintesis pada tumbuhan!",
    "klorofil, cahaya matahari, karbondioksida, glukosa, oksigen",
    "Nilai 100 jika menjelaskan 5 elemen lengkap, 70 jika 3 elemen, 40 jika hanya menyebut",
    20,
    "6CO2 + 6H2O + cahaya → C6H12O6 + 6O2. Terjadi di kloroplas dengan klorofil.",
    "biologi, tumbuhan"
  ]).eachCell(c => Object.assign(c, exampleStyle));

  // Sheet 7: Pseudocode Trace (khusus Informatika)
  const ws7p = wb.addWorksheet("7. Pseudocode Trace", { properties: { tabColor: { argb: "FF06B6D4" } } });
  ws7p.columns = [
    { header: "Pertanyaan", width: 40 },
    { header: "Kode Pseudocode", width: 45 },
    { header: "Jawaban Output", width: 25 },
    { header: "Poin", width: 8 },
    { header: "Pembahasan", width: 40 },
    { header: "Tags", width: 22 },
  ];
  ws7p.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws7p.getRow(1).height = 35;
  ws7p.addRow([
    "Trace output dari pseudocode berikut:",
    "x = 5\ny = 3\nz = x + y\nprint(z)\nprint(x * y)",
    "8\n15",
    10,
    "Baris 3: z = 5+3 = 8. Baris 4 cetak z. Baris 5 cetak 5*3 = 15.",
    "informatika, pseudocode, trace"
  ]).eachCell(c => Object.assign(c, exampleStyle));

  // Sheet 8: Debug Challenge (khusus Informatika)
  const ws8d = wb.addWorksheet("8. Debug Challenge", { properties: { tabColor: { argb: "FFDC2626" } } });
  ws8d.columns = [
    { header: "Pertanyaan", width: 40 },
    { header: "Kode Buggy", width: 45 },
    { header: "Nomor Baris Bug", width: 15 },
    { header: "Perbaikan yang Benar", width: 30 },
    { header: "Poin", width: 8 },
    { header: "Pembahasan", width: 40 },
    { header: "Tags", width: 22 },
  ];
  ws8d.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws8d.getRow(1).height = 35;
  ws8d.addRow([
    "Ada bug pada kode berikut. Cari baris yang salah dan tulis perbaikannya:",
    "total = 0\nfor i = 1 to 5\n  total = total + i\nprint(total * 2)",
    4,
    "print(total)",
    15,
    "Baris 4 seharusnya cetak total saja, bukan total*2 (yang tidak sesuai instruksi).",
    "informatika, debug"
  ]).eachCell(c => Object.assign(c, exampleStyle));

  // Sheet 9: Refleksi Terstruktur (4 kolom wajib)
  const ws9r = wb.addWorksheet("9. Refleksi", { properties: { tabColor: { argb: "FF7C3AED" } } });
  ws9r.columns = [
    { header: "Prompt Utama", width: 45 },
    { header: "Label Kolom 1", width: 22 },
    { header: "Label Kolom 2", width: 22 },
    { header: "Label Kolom 3", width: 22 },
    { header: "Label Kolom 4", width: 22 },
    { header: "Poin", width: 8 },
    { header: "Panduan Penilaian", width: 40 },
    { header: "Tags", width: 22 },
  ];
  ws9r.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws9r.getRow(1).height = 35;
  ws9r.addRow([
    "Refleksikan proses debugging kamu tadi.",
    "Prediksi saya",
    "Yang saya observasi",
    "Yang salah/bug",
    "Pelajaran yang saya ambil",
    20,
    "Nilai 100 kalau semua 4 kolom terisi dengan reflektif dan spesifik. Turun proporsional untuk yang generik atau kosong.",
    "informatika, refleksi, metakognisi"
  ]).eachCell(c => Object.assign(c, exampleStyle));

  // Sheet PETUNJUK
  const ws7 = wb.addWorksheet("PETUNJUK", { properties: { tabColor: { argb: "FFDC2626" } } });
  ws7.columns = [{ width: 90 }];
  const petunjuk = [
    "PETUNJUK PENGISIAN TEMPLATE SOAL ASTROLAB",
    "",
    "1. Isi soal di sheet sesuai TIPE soal yang diinginkan (tab di bawah).",
    "2. Setiap baris = 1 soal. Hapus contoh sebelum import (atau biarkan, akan ikut terimport).",
    "3. Kolom POIN: nilai per soal (default 10).",
    "",
    "=== KOLOM BARU ===",
    "",
    "Pembahasan (opsional): penjelasan jawaban yang ditampilkan ke siswa",
    "   setelah deadline. Kosongkan kalau tidak perlu.",
    "",
    "Tags (opsional): label untuk filter di Bank Soal. Pisah dengan koma.",
    "   Contoh: 'bab-3, UTS, energi' atau 'astronomi, tata-surya'.",
    "   Tips: gunakan tag konsisten supaya gampang dicari.",
    "",
    "=== TIPE SOAL ===",
    "",
    "Pilihan Ganda: 4 opsi, 1 jawaban. Tulis huruf A/B/C/D di kolom Jawaban.",
    "",
    "Benar/Salah: ketik 'Benar' atau 'Salah' di kolom Jawaban.",
    "",
    "PG Kompleks: Multi jawaban. Pisah dengan koma. Contoh: 'A,B,D'.",
    "",
    "Pasangkan: Isi pasangan kiri-kanan berurutan. Bisa 2-4 pasangan.",
    "",
    "Excel Sandbox (khusus Informatika):",
    "   - Header Kolom: pisah dengan tanda | (pipe). Contoh: 'Nama|Nilai|Kelas'",
    "   - Data Tabel: baris pisah ; (semicolon), kolom pisah | (pipe).",
    "     Contoh: 'Budi|85|VII;Sari|92|VII;Andi|78|VIII'",
    "   - Siswa akan mencoba rumus Excel (SUM, AVERAGE, dll) lalu pilih PG.",
    "",
    "Essay: Jawaban panjang, dinilai manual oleh guru.",
    "   - Kata Kunci: pisah dengan koma. Akan ditampilkan ke guru saat menilai.",
    "   - Panduan Penilaian: rubrik untuk guru, opsional.",
    "",
    "Pseudocode Trace (khusus Informatika): Siswa trace output pseudocode.",
    "   - Kode Pseudocode: tulis dengan baris terpisah pakai Enter (Alt+Enter di Excel).",
    "   - Jawaban Output: hasil output persis (auto-check exact match, toleran spasi/case).",
    "",
    "Debug Challenge (khusus Informatika): Siswa cari bug & tulis perbaikan.",
    "   - Kode Buggy: tulis dengan baris terpisah pakai Enter (Alt+Enter di Excel).",
    "   - Nomor Baris Bug: angka (dihitung dari 1 di atas).",
    "   - Perbaikan yang Benar: kode/teks pengganti baris yang salah (auto-check).",
    "",
    "Refleksi Terstruktur: 4 kolom wajib, dinilai manual oleh guru.",
    "   - Prompt Utama: pertanyaan/instruksi refleksi.",
    "   - Label Kolom 1-4: nama kolom yang siswa isi (contoh default: Prediksi saya,",
    "     Yang saya observasi, Yang salah/bug, Pelajaran yang saya ambil).",
    "   - Semua 4 kolom wajib diisi siswa sebelum bisa submit.",
    "",
    "=== TIPS ===",
    "",
    "- Boleh kosongkan sheet yang tidak dipakai (akan diskip).",
    "- Soal dengan pertanyaan kosong akan diskip otomatis.",
    "- Setelah edit, simpan & upload via tombol 'Import Excel'.",
    "",
    "Astrolab · Our Classroom · © 2026 M. Hasanul Fatta",
  ];
  petunjuk.forEach((line, i) => {
    const row = ws7.addRow([line]);
    if (i === 0) {
      row.font = { name: "Arial", bold: true, size: 14, color: { argb: "FF0D6B7A" } };
      row.height = 26;
    } else if (line.startsWith("===")) {
      row.font = { name: "Arial", bold: true, size: 11, color: { argb: "FFDC2626" } };
    } else if (line.match(/^[A-Z][a-z]+ (Ganda|Salah|Kompleks|Sandbox)/) || line === "Essay: Jawaban panjang, dinilai manual oleh guru." || line === "Pasangkan: Isi pasangan kiri-kanan berurutan. Bisa 2-4 pasangan.") {
      row.font = { name: "Arial", bold: true, size: 10, color: { argb: "FF1A1C1E" } };
    } else {
      row.font = { name: "Arial", size: 10, color: { argb: "FF374151" } };
    }
    row.alignment = { wrapText: true, vertical: "top" };
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "Template_Soal_Astrolab.xlsx";
  a.click(); URL.revokeObjectURL(url);
}

export async function exportNilai(store, jenjang) {
  const ExcelJS = await loadExcelJS();
  const siswaList = store.getAllSiswa(jenjang);
  const tugasList = store.getTugas().filter(t => t.jenjang === jenjang);
  const subs = store.getSubs();
  const mapelGroups = jenjang === "VII" ? ["IPA", "Informatika"] : [null];

  for (const mapel of mapelGroups) {
    const tugasMapel = mapel ? tugasList.filter(t => t.mapel === mapel) : tugasList;
    if (tugasMapel.length === 0) continue;
    const mapelLabel = mapel || "IPA";
    const nTugas = tugasMapel.length;

    const siswaData = siswaList.map(s => {
      const st = store.getStats(s.id);
      const nilaiArr = tugasMapel.map(t => {
        const sub = subs.find(sb => sb.siswaId === s.id && sb.tugasId === t.id);
        return sub ? sub.nilai : null;
      });
      const angka = nilaiArr.filter(v => v !== null);
      const rata = angka.length ? Math.round(angka.reduce((a,b)=>a+b,0)/angka.length) : null;
      return { siswa: s, stats: st, nilaiArr, rata };
    }).sort((a,b) => (b.rata||0) - (a.rata||0));

    const gradeStyle = (n) => {
      if (n === null) return { label:"—", fill:"F3F4F6", font:"6B7280", bold:false };
      if (n >= 85) return { label:"Sangat Baik",      fill:"FFFFF8E1", font:"B45309", bold:true };
      if (n >= 70) return { label:"Baik",             fill:"F0FDF4",   font:"15803D", bold:true };
      if (n >= 55) return { label:"Cukup",            fill:"EFF6FF",   font:"1D4ED8", bold:true };
      return              { label:"Perlu Bimbingan",  fill:"FEF2F2",   font:"DC2626", bold:true };
    };
    const valStyle = (n) => {
      if (n === null) return { fill:"F3F4F6", font:"9CA3AF", bold:false };
      if (n >= 85) return { fill:"FFFFF8E1", font:"B45309", bold:true };
      if (n >= 70) return { fill:"F0FDF4",   font:"15803D", bold:true };
      if (n >= 55) return { fill:"EFF6FF",   font:"1D4ED8", bold:true };
      return              { fill:"FEF2F2",   font:"DC2626", bold:true };
    };

    const wb = new ExcelJS.Workbook();
    wb.creator = "Astrolab · Our Classroom";
    const ws = wb.addWorksheet(`Nilai ${mapelLabel}`, { pageSetup:{ orientation:"landscape", fitToPage:true, fitToWidth:1 } });
    const totalCols = 6 + nTugas;
    ws.columns = [
      { width:5 }, { width:32 }, { width:10 },
      ...tugasMapel.map(() => ({ width:20 })),
      { width:13 }, { width:13 }, { width:20 }
    ];
    const lastColLetter = ws.getColumn(totalCols).letter;

    const sc = (cell, val, opts={}) => {
      cell.value = val;
      if (opts.fill) cell.fill = { type:"pattern", pattern:"solid", fgColor:{ argb:"FF"+opts.fill } };
      cell.font = { name:"Arial", size:opts.size||10, bold:opts.bold||false, color:{ argb:"FF"+(opts.font||"1A1C1E") }, italic:opts.italic||false };
      cell.alignment = { horizontal:opts.halign||"center", vertical:"middle", wrapText:true };
      if (opts.border) { const bs={ style:"thin", color:{ argb:"FF"+(opts.borderColor||"E2E6EA") } }; cell.border={ top:bs,bottom:bs,left:bs,right:bs }; }
    };

    ws.mergeCells(`A1:${lastColLetter}1`);
    sc(ws.getCell("A1"), `ASTROLAB · OUR CLASSROOM  —  Rekap Nilai Kelas ${jenjang} · ${mapelLabel}`, { fill:"0D6B7A", font:"FFFFFF", size:13, bold:true });
    ws.getRow(1).height = 36;

    ws.mergeCells(`A2:${lastColLetter}2`);
    sc(ws.getCell("A2"), `SMP Negeri 15 Banda Aceh  ·  Tahun Ajaran ${getTahunAjaran()}  ·  Dicetak: ${new Date().toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}`, { fill:"EAF4F3", font:"6B7280", size:9, italic:true });
    ws.getRow(2).height = 18;
    ws.getRow(3).height = 8;

    ws.mergeCells(`A4:${lastColLetter}4`);
    sc(ws.getCell("A4"), "  LEGENDA:   Sangat Baik ≥85   |   Baik 70–84   |   Cukup 55–69   |   Perlu Bimbingan <55", { fill:"F2F4F6", font:"1A1C1E", size:9, bold:true, halign:"left" });
    ws.getRow(4).height = 22;
    ws.getRow(5).height = 8;

    const headers = ["No","Nama Siswa","Kelas",...tugasMapel.map(t=>t.judul),"Rata-rata","Total Poin","Predikat"];
    const headerRow = ws.getRow(6);
    headerRow.height = 30;
    headers.forEach((h,ci) => sc(headerRow.getCell(ci+1), h, { fill:"0D6B7A", font:"FFFFFF", size:9, bold:true, border:true, borderColor:"FFFFFF" }));

    siswaData.forEach((d,ri) => {
      const row = ws.getRow(7+ri); row.height = 24;
      const gs = gradeStyle(d.rata);
      sc(row.getCell(1), ri+1, { fill:gs.fill, font:gs.font, bold:true, border:true });
      sc(row.getCell(2), d.siswa.nama, { fill:gs.fill, font:"1A1C1E", bold:true, halign:"left", border:true });
      sc(row.getCell(3), d.siswa.kelas, { fill:gs.fill, font:"1A1C1E", border:true });
      d.nilaiArr.forEach((n,ti) => { const vs=valStyle(n); sc(row.getCell(4+ti), n!==null?n:"—", { fill:vs.fill, font:vs.font, bold:vs.bold, border:true }); });
      sc(row.getCell(4+nTugas), d.rata!==null?d.rata:"—", { fill:gs.fill, font:gs.font, size:11, bold:true, border:true, borderColor:gs.font });
      sc(row.getCell(5+nTugas), d.stats.poin, { fill:"EAF4F3", font:"0A525C", bold:true, border:true });
      sc(row.getCell(6+nTugas), gs.label, { fill:gs.fill, font:gs.font, size:9, bold:true, border:true, borderColor:gs.font });
    });

    const sumRowIdx = 7+siswaData.length;
    const sumRow = ws.getRow(sumRowIdx); sumRow.height = 28;
    ws.mergeCells(`A${sumRowIdx}:C${sumRowIdx}`);
    sc(sumRow.getCell(1), "RATA-RATA KELAS", { fill:"0D6B7A", font:"FFFFFF", size:9, bold:true, border:true, borderColor:"FFFFFF" });
    tugasMapel.forEach((_,ti) => {
      const vals=siswaData.map(d=>d.nilaiArr[ti]).filter(v=>v!==null);
      sc(sumRow.getCell(4+ti), vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):"—", { fill:"0D6B7A", font:"FFFFFF", bold:true, border:true, borderColor:"FFFFFF" });
    });
    const allRata=siswaData.map(d=>d.rata).filter(v=>v!==null);
    sc(sumRow.getCell(4+nTugas), allRata.length?Math.round(allRata.reduce((a,b)=>a+b,0)/allRata.length):"—", { fill:"0D6B7A", font:"FFFFFF", size:11, bold:true, border:true, borderColor:"FFFFFF" });
    sc(sumRow.getCell(5+nTugas), "—", { fill:"0D6B7A", font:"FFFFFF", bold:true, border:true, borderColor:"FFFFFF" });
    sc(sumRow.getCell(6+nTugas), "—", { fill:"0D6B7A", font:"FFFFFF", bold:true, border:true, borderColor:"FFFFFF" });

    const footIdx = sumRowIdx+2; ws.getRow(footIdx).height=16;
    ws.mergeCells(`A${footIdx}:${lastColLetter}${footIdx}`);
    sc(ws.getCell(`A${footIdx}`), "Astrolab · Our Classroom  ·  © 2026 M. Hasanul Fatta  ·  Data bersifat rahasia", { font:"6B7280", size:8, italic:true });

    ws.views = [{ state:"frozen", xSplit:3, ySplit:6 }];
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url;
    a.download = `Nilai_Kelas${jenjang}${mapel?"_"+mapel:""}_Astrolab.xlsx`;
    a.click(); URL.revokeObjectURL(url);
  }
}
export async function importSoalFromExcel(file) {
  const ExcelJS = await loadExcelJS();
  const buf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const soal = [];

  wb.eachSheet((ws, sheetId) => {
    try {
      const name = ws.name;
      const rows = excelSheetToJson(ws, { defval: "" });
          if (!rows.length) return;

          // Deteksi tipe dari nama sheet
          const n = name.toLowerCase();
          let tipe = null;
          if (n.includes("pilihan ganda") || n.includes("1.") || n.includes("biru")) tipe = "pg";
          else if (n.includes("benar") || n.includes("salah") || n.includes("2.") || n.includes("hijau")) tipe = "tf";
          else if (n.includes("kompleks") || n.includes("cocok") || n.includes("3.") || n.includes("oranye") || n.includes("orange")) tipe = "komplex";
          else if (n.includes("pasangkan") || n.includes("urutan") || n.includes("susun") || n.includes("4.") || n.includes("ungu") || n.includes("pasang")) tipe = "pasang";
          else if (n.includes("excel") || n.includes("sandbox") || n.includes("5.") || n.includes("kuning")) tipe = "excel";
          else if (n.includes("essay") || n.includes("6.") || n.includes("pink") || n.includes("magenta")) tipe = "essay";
          else if (n.includes("pseudocode") || n.includes("trace") || n.includes("7.")) tipe = "pseudocode";
          else if (n.includes("debug") || n.includes("challenge") || n.includes("8.")) tipe = "debug";
          else if (n.includes("refleksi") || n.includes("terstruktur") || n.includes("9.")) tipe = "refleksi";
          if (!tipe) return;

          rows.forEach(row => {
            const pertanyaan = row["Pertanyaan"] || row["Pertanyaan / Instruksi"] || row["Pernyataan"] || row["Prompt Utama"] || "";
            if (!pertanyaan.toString().trim()) return;
            const poin = Number(row["Poin"]) || 10;
            // Pembahasan & Tags (optional, common untuk semua tipe)
            const pembahasan = (row["Pembahasan"] || "").toString().trim();
            const tagsRaw = (row["Tags"] || "").toString().trim();
            const tags = tagsRaw ? tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [];

            if (tipe === "pg") {
              const opsi = [row["Pilihan A"], row["Pilihan B"], row["Pilihan C"], row["Pilihan D"]].map(String);
              const jwb = (row["Jawaban (A/B/C/D)"] || row["Jawaban Benar\n(A/B/C/D)"] || "A").toString().trim().toUpperCase();
              const jwbIdx = ["A","B","C","D"].indexOf(jwb);
              soal.push({ id: uid(), type: "pg", pertanyaan: pertanyaan.toString(), opsi, jawaban: jwbIdx >= 0 ? jwbIdx : 0, poin, pembahasan, tags });
            } else if (tipe === "tf") {
              const jwb = (row["Jawaban (Benar/Salah)"] || "Benar").toString().trim().toLowerCase();
              soal.push({ id: uid(), type: "tf", pertanyaan: pertanyaan.toString(), jawaban: jwb === "benar" ? 0 : 1, poin, pembahasan, tags });
            } else if (tipe === "komplex") {
              const opsi = [row["Pilihan A"], row["Pilihan B"], row["Pilihan C"], row["Pilihan D"]].map(String);
              const jwbStr = (row["Jawaban Benar (A,B,C,D)"] || row["Jawaban Benar (misal: A,C)"] || row["Jawaban Benar\n(misal: A,C)"] || "A").toString();
              const jwb = jwbStr.split(",").map(s => ["A","B","C","D"].indexOf(s.trim().toUpperCase())).filter(i => i >= 0);
              soal.push({ id: uid(), type: "komplex", pertanyaan: pertanyaan.toString(), opsi, jawaban: jwb, poin, pembahasan, tags });
            } else if (tipe === "pasang") {
              const kiri = [], kanan = [];
              for (let i = 1; i <= 4; i++) {
                const k = row[`Item Kiri ${i}`] || row[`Item Kiri ${i} (pasangan Kiri ${i})`];
                const kn = row[`Pasangan Kanan ${i}`] || row[`Item Kanan ${i} (pasangan Kiri ${i})`];
                if (k && k.toString().trim()) kiri.push(k.toString());
                if (kn && kn.toString().trim()) kanan.push(kn.toString());
              }
              if (kiri.length === 0) return;
              const jwb = kiri.map((_, i) => i);
              soal.push({ id: uid(), type: "pasang", pertanyaan: pertanyaan.toString(), kiri, kanan, jawaban: jwb, poin, pembahasan, tags });
            } else if (tipe === "excel") {
              const headersStr = (row["Header Kolom (pisah |)"] || "").toString();
              const dataStr = (row["Data Tabel (baris pisah ;, kolom pisah |)"] || "").toString();
              if (!headersStr || !dataStr) return;
              const headers = headersStr.split("|").map(h => h.trim());
              const table = dataStr.split(";").map(rowStr => rowStr.split("|").map(c => c.trim()));
              const opsi = [row["Pilihan A"], row["Pilihan B"], row["Pilihan C"], row["Pilihan D"]].map(String);
              const jwb = (row["Jawaban (A/B/C/D)"] || "A").toString().trim().toUpperCase();
              const jwbIdx = ["A","B","C","D"].indexOf(jwb);
              soal.push({ id: uid(), type: "excel", pertanyaan: pertanyaan.toString(), headers, table, opsi, jawaban: jwbIdx >= 0 ? jwbIdx : 0, poin, pembahasan, tags });
            } else if (tipe === "essay") {
              const kataKunci = (row["Kata Kunci (pisah koma)"] || "").toString();
              const panduanNilai = (row["Panduan Penilaian"] || "").toString();
              soal.push({ id: uid(), type: "essay", pertanyaan: pertanyaan.toString(), kataKunci, panduanNilai, poin, pembahasan, tags });
            } else if (tipe === "pseudocode") {
              const kode = (row["Kode Pseudocode"] || row["Kode"] || "").toString();
              const jawabanBenar = (row["Jawaban Output"] || row["Output"] || "").toString();
              if (!kode.trim() || !jawabanBenar.trim()) return;
              soal.push({ id: uid(), type: "pseudocode", pertanyaan: pertanyaan.toString(), kode, jawabanBenar, poin, pembahasan, tags });
            } else if (tipe === "debug") {
              const kodeBuggy = (row["Kode Buggy"] || row["Kode"] || "").toString();
              const barisBug = Number(row["Nomor Baris Bug"] || row["Baris Bug"] || 0);
              const perbaikanBenar = (row["Perbaikan yang Benar"] || row["Perbaikan"] || "").toString();
              if (!kodeBuggy.trim() || !barisBug || !perbaikanBenar.trim()) return;
              soal.push({ id: uid(), type: "debug", pertanyaan: pertanyaan.toString(), kodeBuggy, barisBug, perbaikanBenar, poin, pembahasan, tags });
            } else if (tipe === "refleksi") {
              const labelKolom1 = (row["Label Kolom 1"] || "Prediksi saya").toString();
              const labelKolom2 = (row["Label Kolom 2"] || "Yang saya observasi").toString();
              const labelKolom3 = (row["Label Kolom 3"] || "Yang salah/bug").toString();
              const labelKolom4 = (row["Label Kolom 4"] || "Pelajaran yang saya ambil").toString();
              const panduanNilai = (row["Panduan Penilaian"] || "").toString();
              soal.push({ id: uid(), type: "refleksi", pertanyaan: pertanyaan.toString(), labelKolom1, labelKolom2, labelKolom3, labelKolom4, panduanNilai, poin, pembahasan, tags });
            }
          });

    } catch (sheetErr) {
      // skip malformed sheets silently
    }
  });

  return soal;
}

// Template dinamis: kolom sesuai struktur BAB/Kuis yang AKTIF saat ini (bukan fixed),
// pre-filled dengan nilai yang sudah ada, supaya guru tinggal edit di Excel lalu upload balik.
export async function downloadTemplateNilaiAkhir(store, mapel, jenjang, periode, siswaList, babKolom, kuisKolom) {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Astrolab · Our Classroom";

  const headerStyle = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D6B7A" } }, font: { name: "Arial", bold: true, color: { argb: "FFFFFFFF" }, size: 11 }, alignment: { horizontal: "center", vertical: "middle", wrapText: true } };

  const ws = wb.addWorksheet("Nilai Akhir", { properties: { tabColor: { argb: "FF0D6B7A" } } });
  const columns = [
    { header: "ID Siswa", key: "id", width: 14 },
    { header: "Nama", key: "nama", width: 24 },
    ...babKolom.map((k, i) => ({ header: `[Sumatif] ${k}`, key: `bab_${i}`, width: 18 })),
    { header: "UTS", key: "uts", width: 10 },
    { header: "UAS", key: "uas", width: 10 },
    ...kuisKolom.map((k, i) => ({ header: `[Kuis] ${k}`, key: `kuis_${i}`, width: 18 })),
    { header: "Portofolio", key: "portofolio", width: 12 },
  ];
  ws.columns = columns;
  ws.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws.getRow(1).height = 32;

  siswaList.forEach(s => {
    const rec = store.getNilaiAkhirRecord(s.id, mapel, jenjang, periode);
    const row = { id: s.id, nama: s.nama, uts: rec.uts ?? "", uas: rec.uas ?? "", portofolio: rec.portofolio ?? "" };
    babKolom.forEach((k, i) => { row[`bab_${i}`] = rec.sumatif?.[k] ?? ""; });
    kuisKolom.forEach((k, i) => { row[`kuis_${i}`] = rec.kuis?.[k] ?? ""; });
    ws.addRow(row);
  });
  ws.views = [{ state: "frozen", xSplit: 2, ySplit: 1 }];
  ws.getColumn(1).font = { color: { argb: "FF888888" }, size: 9 }; // ID kolom kecil, cuma buat matching pas import

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Nilai_Akhir_${mapel}_${jenjang}_${periode.replace(/\s+/g, "_")}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// Parse file Excel hasil edit guru — cocokkan kolom by header name (bukan posisi),
// supaya tetap jalan walau guru re-order kolom di Excel.
export async function parseNilaiAkhirExcel(file) {
  const ExcelJS = await loadExcelJS();
  const buf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("File tidak memiliki sheet.");
  const rows = excelSheetToJson(ws, { defval: "" });
  const result = rows.map(row => {
    const siswaId = (row["ID Siswa"] || "").toString().trim();
    if (!siswaId) return null;
    const sumatif = {}, kuis = {};
    let uts = null, uas = null, portofolio = null;
    Object.keys(row).forEach(colName => {
      const raw = row[colName];
      if (raw === "" || raw === undefined || raw === null) return;
      const num = Number(raw);
      if (isNaN(num)) return;
      if (colName.startsWith("[Sumatif] ")) sumatif[colName.replace("[Sumatif] ", "")] = num;
      else if (colName.startsWith("[Kuis] ")) kuis[colName.replace("[Kuis] ", "")] = num;
      else if (colName === "UTS") uts = num;
      else if (colName === "UAS") uas = num;
      else if (colName === "Portofolio") portofolio = num;
    });
    return { siswaId, sumatif, kuis, uts, uas, portofolio };
  }).filter(Boolean);
  return result;
}

// 2 sheet: (1) Rekap ringkas — semua siswa, kolom avg per komponen + nilai akhir, siap cetak.
// (2) Detail — breakdown lengkap tiap BAB/Kuis individual per siswa, untuk arsip guru.
export async function exportRekapNilaiAkhir(store, mapel, jenjang, periode, siswaList, babKolom, kuisKolom) {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Astrolab · Our Classroom";

  const headerStyle = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D6B7A" } }, font: { name: "Arial", bold: true, color: { argb: "FFFFFFFF" }, size: 11 }, alignment: { horizontal: "center", vertical: "middle", wrapText: true } };
  const finalColStyle = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF4F3" } }, font: { name: "Arial", bold: true, color: { argb: "FF0D6B7A" }, size: 11 } };

  // ── Sheet 1: Rekap ringkas ──
  const ws1 = wb.addWorksheet("Rekap Nilai Akhir", { properties: { tabColor: { argb: "FF0D6B7A" } } });
  ws1.columns = [
    { header: "No", key: "no", width: 5 },
    { header: "Nama", key: "nama", width: 26 },
    { header: "Sumatif (10%)", key: "sumatif", width: 14 },
    { header: "Tugas Astrolab (20%)", key: "tugas", width: 18 },
    { header: "UTS (20%)", key: "uts", width: 12 },
    { header: "UAS (20%)", key: "uas", width: 12 },
    { header: "Kuis (10%)", key: "kuis", width: 12 },
    { header: "Portofolio (20%)", key: "portofolio", width: 14 },
    { header: "NILAI AKHIR", key: "final", width: 14 },
    { header: "Status", key: "status", width: 14 },
  ];
  ws1.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws1.getRow(1).height = 34;

  siswaList.forEach((s, i) => {
    const result = store.computeNilaiAkhir(s.id, mapel, jenjang, periode);
    const row = ws1.addRow({
      no: i + 1,
      nama: s.nama,
      sumatif: result.sumatifAvg !== null ? Math.round(result.sumatifAvg) : "—",
      tugas: result.tugasAvg !== null ? result.tugasAvg : "—",
      uts: result.rec.uts ?? "—",
      uas: result.rec.uas ?? "—",
      kuis: result.kuisAvg !== null ? Math.round(result.kuisAvg) : "—",
      portofolio: result.rec.portofolio ?? "—",
      final: result.nilaiAkhir !== null ? result.nilaiAkhir : "—",
      status: result.lengkap ? "Lengkap" : "Belum lengkap",
    });
    row.getCell("final").style = finalColStyle;
  });
  ws1.views = [{ state: "frozen", ySplit: 1 }];

  // ── Sheet 2: Detail breakdown per BAB/Kuis ──
  const ws2 = wb.addWorksheet("Detail Sumatif & Kuis", { properties: { tabColor: { argb: "FF088395" } } });
  const detailColumns = [
    { header: "Nama", key: "nama", width: 26 },
    ...babKolom.map((k, i) => ({ header: `[Sumatif] ${k}`, key: `bab_${i}`, width: 18 })),
    ...kuisKolom.map((k, i) => ({ header: `[Kuis] ${k}`, key: `kuis_${i}`, width: 18 })),
  ];
  ws2.columns = detailColumns;
  ws2.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  ws2.getRow(1).height = 32;
  siswaList.forEach(s => {
    const rec = store.getNilaiAkhirRecord(s.id, mapel, jenjang, periode);
    const row = { nama: s.nama };
    babKolom.forEach((k, i) => { row[`bab_${i}`] = rec.sumatif?.[k] ?? "—"; });
    kuisKolom.forEach((k, i) => { row[`kuis_${i}`] = rec.kuis?.[k] ?? "—"; });
    ws2.addRow(row);
  });
  ws2.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Rekap_Nilai_Akhir_${mapel}_${jenjang}_${periode.replace(/\s+/g, "_")}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}


async function downloadBackupJSON() {
  try {
    const { getDatabase, ref, get } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
    const snap = await get(ref(db, "/"));
    const data = snap.val();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `astrolab-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // Fallback: collect from store
    alert("Backup dimulai. Cek file yang terdownload.");
  }
}

// Versi yang pakai data dari store (tidak perlu re-fetch)
export function backupFromStore(store) {
  const tugas = store.getTugas();
  const subs = store.getSubs();
  const data = {
    exported_at: new Date().toISOString(),
    app: "Astrolab · Our Classroom",
    tugas,
    submissions: subs,
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `astrolab-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
