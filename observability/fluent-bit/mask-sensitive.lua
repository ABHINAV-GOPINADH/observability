function mask_credit_cards(tag, timestamp, record)
    -- Mask credit card numbers (simplified pattern)
    if record["message"] then
        record["message"] = string.gsub(record["message"], "%d%d%d%d%-%d%d%d%d%-%d%d%d%d%-%d%d%d%d", "****-****-****-****")
    end
    return 2, timestamp, record
end