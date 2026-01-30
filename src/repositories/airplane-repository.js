const CrudRepository = require('./crud-repository')

const { tbl_Airplane } = require('../models')

class AirplaneRepository extends CrudRepository 
{
    constructor() {
        super(tbl_Airplane);
    }
}

module.exports=AirplaneRepository
