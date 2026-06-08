function validateCreateRequest(req, res, next) {
    if (!req.body.modelNumber) {
        return res.status(400).json({
            success: false,
            message: "modelNumber is required",
            data: {},
            error: "modelNumber is required",
        });
    }
    
}