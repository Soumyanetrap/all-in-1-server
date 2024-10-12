
const { DB_INACTIVITY_TIMEOUT } = require('../config/config');
const logger = require('../utils/logger');

class AWS{
    constructor(client) {
        this.client = client;
        this.isConnected = false;
        // this.inactivityTimeout = DB_INACTIVITY_TIMEOUT;
        // this.inactivityTimer = null;
    }
    // resetInactivityTimer() {
    //     if (this.inactivityTimer) {
    //         clearTimeout(this.inactivityTimer);
    //     }
    //     this.inactivityTimer = setTimeout(async () => {
    //         logger.log('Inactivity timeout reached, disconnecting...');
    //         await this.close();
    //     }, this.inactivityTimeout);
    // }

    async createTable(tableName, columns) {
        if (!this.client) {
            throw new Error('Client is not initialized');
        }
        // Construct the SQL query for table creation
        const primaryKeyColumns = [];
        const columnsDefinition = columns.map(col => {
            // Base column definition
            let definition = `${col.name} ${col.type}`;

            const constraints = col.keys.split(',')
            // console.log(constraints)
            constraints.forEach(constraint => { 
                // Collect primary key columns
                if (constraint && constraint === 'PRIMARY KEY') {
                    primaryKeyColumns.push(col.name);
                } else {
                    definition += ` ${col.keys}`;
                }
            })

            if (col.foreign_key) {
                definition += ` REFERENCES ${col.foreign_key.table}(${col.foreign_key.column}) ON DELETE CASCADE`;
            }

            return definition;
        }).join(', ');

        // Create composite primary key definition if there are multiple primary key columns
        const primaryKeyDefinition = primaryKeyColumns.length > 0 
            ? `PRIMARY KEY (${primaryKeyColumns.join(', ')})` 
            : '';

        // Construct the final query
        const query = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnsDefinition}${primaryKeyDefinition ? ', ' + primaryKeyDefinition : ''})`;
//Create only if table is not present
        console.log(query)
        try {
            await this.client.query(query); // Execute the query
            logger.log(`Table ${tableName} created successfully`);
            return true; // Table creation successful
        } catch (err) {
            logger.log('Table creation error', err.stack);
            return false; // Table creation failed
        }
    }

    async createENUM(name, values) {
        if (!this.client) {
            throw new Error('Client is not initialized');
        }

        const valuesDefinition = values.map(col => `'${col}'`).join(', ');
        const query = `CREATE TYPE ${name} AS ENUM (${valuesDefinition});`
        // console.log(query)
        try {
            await this.client.query(query); // Execute the query
            logger.log(`ENUM ${name} created successfully`)
            return true; // ENUM creation successful
        } catch (err) {
            logger.log('ENUM creation error', err.stack);
            return false; // ENUM creation failed
        }
    }
    
    async addColumn(tableName, columns) {
        if (!this.client) {
            throw new Error('Client is not initialized');
        }

        const columnsDefinition = columns.map(col => `ADD ${col.name} ${col.type} ${col.keys}`).join(', ');
        const query = `ALTER TABLE  ${tableName} ${columnsDefinition}`
        // console.log(query)
        try {
            await this.client.query(query); // Execute the query
            logger.log(`Table ${tableName} Altered successfully`);
            return true; // Table creation successful
        } catch (err) {
            logger.log('Table Alteration error', err.stack);
            return false; // Table creation failed
        }
    }

    async alterColumn(tableName, columns) {
        if (!this.client) {
            throw new Error('Client is not initialized');
        }

        // Construct column modifications
        const columnsDefinition = columns.map(col => {
            // Define the clauses
            const typeClause = col.type ? `TYPE ${col.type.split(' DEFAULT')[0]}` : '';
            const defaultClause = col.type && col.type.includes('DEFAULT') ? `SET DEFAULT ${col.type.split('DEFAULT ')[1]}` : '';
            const notNullClause = col.keys ? `SET ${col.keys}` : '';
        
            // Construct the full ALTER COLUMN command for each modification
            const alterations = [];
            if (typeClause) alterations.push(`ALTER COLUMN ${col.name} ${typeClause}`);
            if (defaultClause) alterations.push(`ALTER COLUMN ${col.name} ${defaultClause}`);
            if (notNullClause) alterations.push(`ALTER COLUMN ${col.name} ${notNullClause}`);
            
            return alterations.join(', ');
        }).join(', ');
        const query = `ALTER TABLE  ${tableName} ${columnsDefinition}`
        // console.log(query)
        try {
            await this.client.query(query); // Execute the query
            logger.log(`Table ${tableName} Altered successfully`);
            return true; // Table creation successful
        } catch (err) {
            logger.log('Table Alteration error', err.stack);
            return false; // Table creation failed
        }
    }

    async insertRow(table, rows, return_back_col) {
    if (!this.client) {
        throw new Error('Client is not initialized');
    }

    // Handle single row insert
    if (!Array.isArray(rows)) {
        rows = [rows]; // Wrap single row in an array
    }

    const columns = Object.keys(rows[0]).join(', ');

    // Create placeholders for batch insert
    const placeholders = rows
        .map((_, rowIndex) =>
            Object.keys(rows[0]).map((_, colIndex) => `$${rowIndex * Object.keys(rows[0]).length + colIndex + 1}`).join(', ')
        )
        .join('), (');

    const values = rows.flatMap(row => Object.values(row));

    const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING ${return_back_col}`;

    try {
        const result = await this.client.query(query, values); // Execute the query with values
        logger.log(`Rows inserted into ${table}:`, rows);
        // If inserting a single row, return the first result; otherwise, return all results
        return rows.length === 1 ? result.rows[0][return_back_col] : result.rows.map(row => row[return_back_col]);
    } catch (err) {
        logger.log('Insertion Error:', err.stack.split('\n')[0], `\ntable:${err.table}, constraint:${err.constraint}, detail:${err.detail}`);
        // console.log(err.detail)
        return err.detail; // Insertion failed
    }
}


    //condition_type == 0 => AND
    async getRow(table, condition, condition_type=0) {
        if (!this.client) {
            throw new Error('Client is not initialized');
        }
    
        // Construct the SQL SELECT query
        const conditionKeys = Object.keys(condition);
        if (conditionKeys.length === 0) {
            throw new Error('Condition must be provided to retrieve a row');
        }
        
        let joiner
        if (condition_type == 0)
            joiner = ' AND '
        else
            joiner = ' OR '
        const conditionString = conditionKeys.map((key, index) => `${key} = $${index + 1}`).join(joiner);
        const values = Object.values(condition);
    
        const query = `SELECT * FROM ${table} WHERE ${conditionString}`;
        console.log(query);
        try {
            const result = await this.client.query(query, values); // Execute the query with values
            console.log("result got")
            if (result.rows.length === 0) {
                logger.log(`No row found in ${table} for condition:`, `email=${condition.email}`);
                return []; // No row found
            }
            logger.log(`Row retrieved from ${table}:`);
            return result.rows; // Return the first matching row
        } catch (err) {
            console.log("Error")
            console.log(err)
            logger.log('Retrieval Error:', err.stack.split('\n')[0], `\ntable:${table}, constraint:${err.constraint}, detail:${err.detail}`);
            return err.detail; // Retrieval failed
        }
    }

    async getRowPatternMatch(table, condition, matchFromBeginning = false) {
        if (!this.client) {
            throw new Error('Client is not initialized');
        }
    
        // Construct the SQL SELECT query
        const conditionKeys = Object.keys(condition);
        if (conditionKeys.length === 0) {
            throw new Error('Condition must be provided to retrieve a row');
        }
    
        // Create the condition string
        const conditionString = conditionKeys.map((key, index) => {
            if (matchFromBeginning) {
                return `${key} LIKE $${index + 1}`; // Match from the beginning
            } else {
                return `${key} LIKE $${index + 1}`; // Default pattern match
            }
        }).join(' AND ');
    
        // Create values with or without leading/trailing '%' based on matchFromBeginning flag
        const values = conditionKeys.map(key => {
            return matchFromBeginning ? `${condition[key]}%` : `%${condition[key]}%`;
        });
    
        const query = `SELECT * FROM ${table} WHERE ${conditionString}`;
        try {
            const result = await this.client.query(query, values); // Execute the query with values
            if (result.rows.length === 0) {
                logger.log(`No row found in ${table} for condition:`, condition);
                return []; // No row found
            }
            logger.log(`Row retrieved from ${table}:`, result.rows);
            return result.rows; // Return all matching rows
        } catch (err) {
            logger.log('Retrieval Error:', err.stack.split('\n')[0], `\ntable:${table}, constraint:${err.constraint}, detail:${err.detail}`);
            return { error: err.detail }; // Return error detail
        }
    }
    
    async getRowsWithJoin(mainTable, joinTable, joinCondition, filterCondition, columns = []) {
        if (!this.client) {
            throw new Error('Client is not initialized');
        }
    
        // Ensure filterCondition is provided
        if (!filterCondition || Object.keys(filterCondition).length === 0) {
            throw new Error('Filter condition must be provided');
        }
    
        // Construct the SQL SELECT query with JOIN
        const filterStrings = [];
        const filterValues = [];
        let valueIndex = 1;
    
        for (const [key, value] of Object.entries(filterCondition)) {
            if (Array.isArray(value)) {
                // Handle IN condition
                const placeholders = value.map((_, i) => `$${valueIndex + i}`).join(', ');
                filterStrings.push(`${key} IN (${placeholders})`);
                filterValues.push(...value);
                valueIndex += value.length;
            } else {
                // Handle equality condition
                filterStrings.push(`${key} = $${valueIndex}`);
                filterValues.push(value);
                valueIndex++;
            }
        }
    
        const filterString = filterStrings.join(' AND ');
    
        // Construct the SELECT clause
        const columnsString = columns.length > 0 ? columns.join(', ') : `${mainTable}.*`;
    
        // Construct the JOIN clause
        const query = `
            SELECT ${columnsString}
            FROM ${mainTable}
            JOIN ${joinTable} ON ${joinCondition}
            WHERE ${filterString}
        `;
        // console.log(query);
        try {
            const result = await this.client.query(query, filterValues); // Execute the query with values
            if (result.rows.length === 0) {
                logger.log(`No rows found in ${mainTable} for condition:`, filterCondition);
                return null; // No rows found
            }
            logger.log(`Rows retrieved from ${mainTable}:`);
            return result.rows; // Return all matching rows
        } catch (err) {
            logger.log('Retrieval Error:', err.stack.split('\n')[0], `\ntable:${err.table}, constraint:${err.constraint}, detail:${err.detail}`);
            return err.detail; // Retrieval failed
        }
    }    
    
    async updateTable(tableName, updates, condition) {
        if (!this.client) {
            throw new Error('Client is not initialized');
        }
    
        // Construct the SQL UPDATE query
        const updateKeys = Object.keys(updates);
        const updateString = updateKeys.map((key, index) => `${key} = $${index + 1}`).join(', ');
        const updateValues = Object.values(updates);
        
        const conditionKeys = Object.keys(condition);
        const conditionString = conditionKeys.map((key, index) => `${key} = $${index + 1 + updateKeys.length}`).join(' AND ');
        const conditionValues = Object.values(condition);
    
        const query = `
            UPDATE ${tableName}
            SET ${updateString}
            WHERE ${conditionString}
        `;
        
        
        // Combine update values and condition values
        const queryValues = [...updateValues, ...conditionValues];

        // console.log(query);
        // console.log(queryValues);
    
        try {
            const result = await this.client.query(query, queryValues); // Execute the query with values
            if (result.rowCount === 0) {
                logger.log(`No rows updated in ${tableName} for condition:`, condition);
                return null; // No rows updated
            }
            logger.log(`Rows updated in ${tableName}:`, result.rowCount);
            return result.rowCount; // Return the number of rows updated
        } catch (err) {
            logger.log('Update Error:', err.stack.split('\n')[0], `\ntable:${err.table}, constraint:${err.constraint}, detail:${err.detail}`);
            return err.detail; // Update failed
        }
    }
    

    async deleteRow(table, condition) {
        if (!this.client) {
            throw new Error('Client is not initialized');
        }

        const conditionKeys = Object.keys(condition);
        if (conditionKeys.length === 0) {
            throw new Error('Condition must be provided to delete a row');
        }
    
        const conditionString = conditionKeys.map((key, index) => `${key} = $${index + 1}`).join(' AND ');
        const values = Object.values(condition);

        // Construct the SQL DROP TABLE query
        const query = `DELETE FROM ${table} WHERE ${conditionString}`;

        // console.log(query);
        try {
            const result = await this.client.query(query, values); // Execute the query with values
            if (result.rowCount > 0) {
                logger.log(`Row deleted from ${table}`);
                return true; // Table deletion successful or table did not exist
            } else {
                logger.log(`No rows found in ${table} for condition:`, condition);
                return false; // No rows found
            }
        
        } catch (err) {
            logger.error('Deletion error', err.stack);
            return false; // Table deletion failed
        }
    }

    async deleteTable(table) {
        if (!this.client) {
            throw new Error('Client is not initialized');
        }

        // Construct the SQL DROP TABLE query
        const query = `DROP TABLE IF EXISTS ${table}`;

        try {
            await this.client.query(query); // Execute the query
            logger.log(`Table ${table} deleted or did not exist.`);
            return true; // Table deletion successful or table did not exist
        } catch (err) {
            logger.error('Table deletion error', err.stack);
            return false; // Table deletion failed
        }
    }

    // async close() {
    //     // if (this.isConnected) {
    //         try {
    //             await this.client.end(); // Close the connection
    //             this.isConnected = false;
    //             logger.log('Connection closed.');
    //         } catch (err) {
    //             logger.error('Error closing connection', err.stack);
    //         }
    //     }
    // }

}

module.exports = AWS
