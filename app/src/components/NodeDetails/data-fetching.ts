import { runQuery } from '../../helpers/neo4j_helper';

export async function getInterRingData(authorId: string) {
    const query = `
        MATCH (a1:Author {id: ${authorId}})-[r:CO_AUTHOR]-(a2:Author)
        RETURN a2.name as coauthor, r.collab_counts_per_year as collabs_per_year
    `;

    const records = await runQuery(query);

    let coauthorsPerYear = {
        2017: [],
        2018: [],
        2019: [],
        2020: [],
    };

    for (let record of records) {
        const coauthor = record.get('coauthor');
        const collabsPerYear = record.get('collabs_per_year');
        const years = [2017, 2018, 2019, 2020];

        for (let i = 0; i < collabsPerYear.length; i++) {
            const collabs = collabsPerYear[i];
            if (collabs > 0) {
                const year = years[i];
                coauthorsPerYear[year].push({
                    name: coauthor,
                    productions: Number(collabs),
                });
            }
        }
    }

    // Order arrays by productions for each year
    for (let year of Object.keys(coauthorsPerYear)) {
        coauthorsPerYear[year].sort((a, b) => b.productions - a.productions);
    }

    return coauthorsPerYear;
}
