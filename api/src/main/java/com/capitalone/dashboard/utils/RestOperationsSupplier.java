package com.capitalone.dashboard.utils;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestOperations;
import org.springframework.web.client.RestTemplate;

import com.capitalone.dashboard.util.Supplier;

@Component
public class RestOperationsSupplier implements Supplier<RestOperations> {
	@Override
	public RestOperations get() {
		return new RestTemplate();
	}
}
