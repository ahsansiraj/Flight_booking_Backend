const { AirplaneServices } = require("../services");
const { StatusCodes } = require("http-status-codes");

async function createAirplane(req, res) {
  try {
    // console.log(req.body);
    const airplane = await AirplaneServices.createAirplane({
      modelNumber: req.body.modelNumber,
      capacity: req.body.capacity,
    });

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "successfully created an airplane",
      data: airplane,
      error: {},
    });
  } catch (error) {
    console.error('Error creating airplane:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "something went wrong while creating an airplane",
      data: {},
      error: error.message || error,
    });
  }
}

module.exports = {
  createAirplane,
};
