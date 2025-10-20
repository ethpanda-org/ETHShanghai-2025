import React, { Component } from 'react';
import countries from '../assets/countries.json';
import '../common.css';
import './css/CountrySelector.css';
import Flag from 'react-world-flags'
import { Modal, Button, List } from 'antd';

const countryRateUS = {
  countryCode: 'US',
  countryName: 'United States',
  currencyCode: 'USD',
  rate: 1
};

class CountrySelectorReact extends Component {
  constructor(props) {
    super(props);
    this.state = {
      countryRates: [countryRateUS],
      selectedCountry: countryRateUS,
      modalVisible: false
    };
  }

  componentDidMount() {
    if (this.props.onChange) {
      this.props.onChange(countryRateUS);
    }
    this.fetchExchangeRates();
  }

  fetchExchangeRates = async () => {
    try {
      const response = await fetch('https://api.frankfurter.dev/v1/latest?base=USD', {
        headers: {
          'Cache-Control': 'no-store' // Disable caching
        }
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      const rates = { ...data.rates, 'USD': 1 };

      const countryRates = countries
        .filter(country => !!rates[country.currencyCode])
        .map(country => ({
          ...country,
          rate: rates[country.currencyCode],
        }));

      this.setState({ countryRates });
    } catch (err) {
      console.error('Error fetching exchange rates:', err);
    }
  };

  toggleModal = () => {
    this.setState(prevState => ({
      modalVisible: !prevState.modalVisible
    }));
  };

  selectCountry = (countryRate) => {
    if (this.props.onChange) {
      this.props.onChange(countryRate);
    }
    this.setState({
      selectedCountry: countryRate,
      modalVisible: false
    });
  };

  render() {
    const { countryRates, selectedCountry, modalVisible } = this.state;

    return (
      <div className="country-selector-container">
        <Button
          type="text"
          className="country-select-button"
          onClick={this.toggleModal}
        >
          <Flag code={selectedCountry.countryCode} className="flag-medium" />
        </Button>

        <Modal
          width="auto"
          title="Select Country"
          open={modalVisible}
          onCancel={this.toggleModal}
          footer={[
            <Button key="close" onClick={this.toggleModal}>
              Close
            </Button>
          ]}
          className="modal-overlay"
        >
          <List
            className="country-list"
            dataSource={countryRates}
            renderItem={(country) => (
              <List.Item
                className="country-item"
                onClick={() => this.selectCountry(country)}
              >
                <Flag code={country.countryCode} className="flag-small" />
                <span>{country.countryName} ({country.currencyCode})</span>
              </List.Item>
            )}
          />
        </Modal>
      </div>
    );
  }
}

export default CountrySelectorReact;
