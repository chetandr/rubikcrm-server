import dayjs from "dayjs";
import { getDB } from "../../db/connection/index.js";
import lodash from "lodash";

function getListing(reportData) {
  let aggregates = { totals: {}, departments: {}, services: {} };
  reportData.forEach((rd) => {
    const date = new Date(rd.DATE);
    const dateKey = `${date.getMonth()}-${date.getFullYear()}`;
    if (rd.INVENTORIES) {
      rd.INVENTORIES.forEach((ld) => {
        // Totals
        if (aggregates.totals[dateKey]) {
          aggregates.totals[dateKey] += lodash.round(ld.AMOUNT, 2);
        } else {
          aggregates.totals[dateKey] = lodash.round(ld.AMOUNT, 2);
        }

        // Totals per service
        if (aggregates.services[dateKey]) {
          if (aggregates.services[dateKey][ld.STOCKITEMNAME]) {
            aggregates.services[dateKey][ld.STOCKITEMNAME] += lodash.round(
              ld.AMOUNT,
              2
            );
          } else {
            aggregates.services[dateKey][ld.STOCKITEMNAME] = lodash.round(
              ld.AMOUNT,
              2
            );
          }
        } else {
          aggregates.services[dateKey] = {
            [ld.STOCKITEMNAME]: lodash.round(ld.AMOUNT, 2),
          };
        }
        // Totals per department
        if (aggregates.departments[dateKey]) {
          if (aggregates.departments[dateKey][ld.DEPARTMENT]) {
            aggregates.departments[dateKey][ld.DEPARTMENT] += lodash.round(
              ld.AMOUNT,
              2
            );
          } else {
            aggregates.departments[dateKey][ld.DEPARTMENT] = lodash.round(
              ld.AMOUNT,
              2
            );
          }
        } else {
          console.log("No department");

          aggregates.departments[dateKey] = {
            [ld.DEPARTMENT]: lodash.round(ld.AMOUNT, 2),
          };
        }
      });
    }
    if (rd.LEDGERENTRIES) {
      rd.LEDGERENTRIES.forEach((ld) => {
        if (ld.LEDGERNAME !== rd.PARTYLEDGERNAME) {
          if (ld.LEDGERNAME.indexOf("GST") < 0) {
            if (aggregates.totals[dateKey]) {
              aggregates.totals[dateKey] += lodash.round(ld.AMOUNT, 2);
            } else {
              aggregates.totals[dateKey] = lodash.round(ld.AMOUNT, 2);
            }
            if (aggregates.services[dateKey]) {
              if (aggregates.services[dateKey][ld.LEDGERNAME]) {
                aggregates.services[dateKey][ld.LEDGERNAME] += lodash.round(
                  ld.AMOUNT,
                  2
                );
              } else {
                aggregates.services[dateKey][ld.LEDGERNAME] = lodash.round(
                  ld.AMOUNT,
                  2
                );
              }
            } else {
              aggregates.services[dateKey] = {
                [ld.LEDGERNAME]: lodash.round(ld.AMOUNT, 2),
              };
            }

            if (aggregates.departments[dateKey]) {
              if (aggregates.departments[dateKey][ld.DEPARTMENT]) {
                console.log(ld.DEPARTMENT);
                aggregates.departments[dateKey][ld.DEPARTMENT] += lodash.round(
                  ld.AMOUNT,
                  2
                );
              } else {
                aggregates.departments[dateKey][ld.DEPARTMENT] = lodash.round(
                  ld.AMOUNT,
                  2
                );
              }
            } else {
              aggregates.departments[dateKey] = {
                [ld.DEPARTMENT]: lodash.round(ld.AMOUNT, 2),
              };
            }
          }
        }
      });
    }
  });
  return [aggregates];
}
function extract(value, key) {
  if (value) {
    if (value[key]) return lodash.round(value[key],2);
    else return 0;
  } else {
    0;
  }
}
function getSummary(aggregates) {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sept",
    "Oct",
    "Nov",
    "Dec",
  ];
  const departments = [
    "STAAH",
    "Domain And Hosting",
    "Digital Media",
    "Maintenance Of Website",
    "Website Development",
    "Branding",
  ];
  const totalsSummary = [];
  for (const dt in aggregates.totals) {
    const dtParts = dt.split("-");
    console.log(`${dtParts[1]}-${months[dtParts[0]]}-01`);
    totalsSummary.push({
      MONTH: months[dtParts[0]],
      YEAR: dtParts[1],
      SORT: new Date(`${dtParts[1]}-${months[dtParts[0]]}-01`),
      AMOUNT: lodash.round(aggregates.totals[dt], 2),
      DEPARTMENTAMOUNT: [
        extract(aggregates.departments[dt], departments[0]),
        extract(aggregates.departments[dt], departments[1]),
        extract(aggregates.departments[dt], departments[2]),
        extract(aggregates.departments[dt], departments[3]),
        extract(aggregates.departments[dt], departments[4]),
      ],
    });
  }
  return [lodash.orderBy(totalsSummary, ["SORT"], ["asc"]), departments];
}

export default async function getSalesSummaryReport(req, res) {
  const { db, client } = await getDB();
  const date = dayjs();
  let year = date.year();
  // get year from Query

  if (req.query.year) {
    year = req.query.year;
  }
  let startDate = `${year}-04-01`;
  let endDate = `${parseInt(year) + 1}-03-31`;
  const dbQuery = [{ VCHTYPE: "Sales" }];
  dbQuery.push({ DATE: { $gte: new Date(startDate) } });
  dbQuery.push({ DATE: { $lte: new Date(endDate) } });
  console.log(JSON.stringify(dbQuery));

  const reportData = await db
    .collection("vouchers")
    .find({ $and: dbQuery })
    .project(["PARTYLEDGERNAME", "LEDGERENTRIES", "INVENTORIES", "DATE"])
    .sort({ DATE: -1 })
    .toArray();
  const [aggregates] = getListing(reportData);
  const [aggregateSummary, departments] = getSummary(aggregates);
  client.close();

  res.status(200).json({aggregateSummary, departments });
}
