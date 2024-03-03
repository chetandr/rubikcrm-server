import dayjs from "dayjs";
import { getDB } from "../../db/connection/index.js";
import lodash from "lodash";

function getListing(reportData, department) {
  const listing = {};
  const months = [
    "01",
    "02",
    "03",
    "04",
    "05",
    "06",
    "07",
    "08",
    "09",
    "10",
    "11",
    "12",
  ];
  const services = {};
  const departments = {};
  reportData.forEach((rd) => {
    let total = 0;
    let sales = 0;
    let taxes = 0;
    let datum = { NAME: rd.PARTYLEDGERNAME };
    const date = new Date(rd.DATE);
    const dateKey = `${date.getDate()}-${
      months[date.getMonth()]
    }-${date.getFullYear()}`;
    if (rd.INVENTORIES) {
      rd.INVENTORIES.forEach((ld) => {
        if (department) {
          if (ld.DEPARTMENT === department) {
            // Inventories total
            total += ld.AMOUNT;
            datum[ld.STOCKITEMNAME] = ld.AMOUNT;
            if (services[ld.STOCKITEMNAME]) {
              services[ld.STOCKITEMNAME] += lodash.round(ld.AMOUNT, 2);
            } else {
              services[ld.STOCKITEMNAME] = ld.AMOUNT;
            }
            if (departments[ld.DEPARTMENT]) {
              departments[ld.DEPARTMENT] += lodash.round(ld.AMOUNT, 2);
            } else {
              departments[ld.DEPARTMENT] = lodash.round(ld.AMOUNT, 2);
            }
          }
        } else {
            // Inventories total
          total += ld.AMOUNT;
          datum[ld.STOCKITEMNAME] = ld.AMOUNT;
          if (services[ld.STOCKITEMNAME]) {
            services[ld.STOCKITEMNAME] += lodash.round(ld.AMOUNT, 2);
          } else {
            services[ld.STOCKITEMNAME] = ld.AMOUNT;
          }
          if (departments[ld.DEPARTMENT]) {
            departments[ld.DEPARTMENT] += lodash.round(ld.AMOUNT, 2);
          } else {
            departments[ld.DEPARTMENT] = lodash.round(ld.AMOUNT, 2);
          }
        }
      });
    }
    if (rd.LEDGERENTRIES) {
      rd.LEDGERENTRIES.forEach((ld) => {
        if (ld.LEDGERNAME !== rd.PARTYLEDGERNAME) {
          if (ld.LEDGERNAME.indexOf("GST") < 0) {
            if (department) {
              if (department === ld.DEPARTMENT) {
                // Ledger total
                total += lodash.round(ld.AMOUNT, 2);
                datum[ld.LEDGERNAME] = ld.AMOUNT;
                if (services[ld.LEDGERNAME]) {
                  services[ld.LEDGERNAME] += lodash.round(ld.AMOUNT, 2);
                } else {
                  services[ld.LEDGERNAME] = ld.AMOUNT;
                }
                if (departments[ld.DEPARTMENT]) {
                  departments[ld.DEPARTMENT] += lodash.round(ld.AMOUNT, 2);
                } else {
                  departments[ld.DEPARTMENT] = lodash.round(ld.AMOUNT, 2);
                }
              }
            } else {
              // Ledger total
              total += lodash.round(ld.AMOUNT, 2);
              datum[ld.LEDGERNAME] = ld.AMOUNT;
              if (services[ld.LEDGERNAME]) {
                services[ld.LEDGERNAME] += lodash.round(ld.AMOUNT, 2);
              } else {
                services[ld.LEDGERNAME] = ld.AMOUNT;
              }
              if (departments[ld.DEPARTMENT]) {
                departments[ld.DEPARTMENT] += lodash.round(ld.AMOUNT, 2);
              } else {
                departments[ld.DEPARTMENT] = lodash.round(ld.AMOUNT, 2);
              }
            }
          } else {
            taxes += ld.AMOUNT;
          }
        } else {
          sales = ld.AMOUNT * -1;
        }
      });
    }

    datum.TOTAL = total || sales;
    if (!listing[rd.PARTYLEDGERNAME]) {
      listing[rd.PARTYLEDGERNAME] = { [dateKey]: datum };
    } else {
      listing[rd.PARTYLEDGERNAME][dateKey] = datum;
    }
  });
  return [listing, services, departments];
}

function getSummary(listing, services, departments) {
  const summary = {
    grandTotal: 0,
    numberOfClients: 0,
    numberOfServices: Object.keys(services).length,
  };
  const sortedServices = [];
  const sortedDepartments = [];
  const sortedListings = [];
  for (const customer in listing) {
    ++summary.numberOfClients;
    const customerSales = { Name: customer };
    let total = 0;
    const items = [];
    for (const date in listing[customer]) {
      summary.grandTotal += listing[customer][date].TOTAL;
      total += listing[customer][date].TOTAL;
      for (const key in listing[customer][date]) {
        if (key !== "NAME" && key !== "TOTAL") {
          items.push({
            SERVICENAME: key,
            SALEPRICE: listing[customer][date][key],
            DATE: date,
          });
        }
      }
      if (total > 0) {
        sortedListings.push({
          NAME: customer,
          TOTALSALES: total,
          ITEMS: items,
        });
      }
    }
  }
  for (const service in services) {
    sortedServices.push({
      name: service,
      sales: lodash.round(services[service], 2),
    });
  }
  for (const department in departments) {
    sortedDepartments.push({
      name: department,
      sales: lodash.round(departments[department], 2),
    });
  }

  return [
    summary,
    lodash.orderBy(sortedServices, ["sales"], ["desc"]),
    lodash.orderBy(sortedListings, ["TOTALSALES"], ["desc"]),
    lodash.orderBy(sortedDepartments, ["sales"], ["desc"]),
  ];
}

function getFilter(criteria) {
  const { type, date1, date2, variance, department } = criteria;
  const columnHead = [];
  let startDate1 = "",
    endDate1 = "",
    startDate2 = "",
    endDate2 = "";
  switch (type) {
    case "yearly":
      startDate1 = `${date1.year}-04-01`;
      endDate1 = dayjs(startDate1)
        .add(1, "year")
        .subtract(1, "day")
        .format("YYYY-MM-DD");
      columnHead.push(date1.year);
      if (variance) {
        columnHead.push(date2.year);
        startDate2 = `${date2.year}-04-01`;
        endDate2 = dayjs(startDate2)
          .add(1, "year")
          .subtract(1, "day")
          .format("YYYY-MM-DD");
      }
      break;
    case "monthly":
      startDate1 = `${date1.year}-${date1.month}-01`;
      endDate1 = dayjs(startDate1).endOf("month").format("YYYY-MM-DD");
      columnHead.push(dayjs(startDate1).format("MMMM YYYY"));

      if (variance) {
        startDate2 = `${date2.year}-${date2.month}-01`;
        endDate2 = dayjs(startDate2).endOf("month").format("YYYY-MM-DD");
        columnHead.push(dayjs(startDate2).format("MMMM YYYY"));
      }
      break;
    case "range":
      startDate1 = `${date1.from}`;
      endDate1 = `${date1.to}`;
      columnHead.push(`${startDate1} - ${endDate1}`);

      if (variance) {
        startDate2 = `${date2.from}`;
        endDate2 = `${date2.to}`;
        columnHead.push(`${startDate2} - ${endDate2}`);
      }
      break;
  }
  return {
    startDate1,
    endDate1,
    startDate2: startDate2 || startDate1,
    endDate2: endDate2 || endDate1,
    variance,
    columnHead,
    department,
  };
}

async function getSalesData(startDate, endDate, department, title) {
  const { db, client } = await getDB();

  const dbQuery = [
    { VCHTYPE: { $in: ["Sales", "Export Sales", "Credit Note"] } },
  ];

  dbQuery.push({ DATE: { $gte: new Date(startDate) } });
  dbQuery.push({ DATE: { $lte: new Date(endDate) } });
  console.log(JSON.stringify(dbQuery));

  const reportData = await db
    .collection("vouchers")
    .find({ $and: dbQuery })
    .project(["PARTYLEDGERNAME", "LEDGERENTRIES", "INVENTORIES", "DATE"])
    .sort({ DATE: -1 })
    .toArray();
  const [listing, services, departments] = getListing(reportData, department);
  const [summary, sortedServices, sortedListings, sortedDepartments] =
    getSummary(listing, services, departments);
  client.close();

  return {
    title,
    departments: sortedDepartments,
    services: sortedServices
  };
}

export default async function getSalesReport(req, res) {
  const {
    startDate1,
    endDate1,
    startDate2,
    endDate2,
    variance,
    columnHead,
    department,
  } = getFilter(req.body);
  console.log({ startDate1, endDate1, startDate2, endDate2, variance });
  let result = [
    await getSalesData(startDate1, endDate1, department, columnHead[0]),
  ];
  if (variance) {
    result.push(
      await getSalesData(startDate2, endDate2, department, columnHead[1])
    );
  }

  res.status(200).json({
    result,
  });
}
